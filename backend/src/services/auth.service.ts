import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";
import { mailService } from "./mail.service.js";
import { env } from "../config/env.js";
import {
  AccountStatus, Gender, EmploymentType, OtpPurpose, TokenPurpose, WorkerVerificationStatus, type Skill
} from "../generated/prisma/client.js";
import { authRepository, type AuthUser } from "../repositories/auth.repository.js";
import type { LoginInput, RegisterInput, WorkerRegistrationInput } from "../validators/auth.schemas.js";
import { AuthenticationError, ConflictError, NotFoundError } from "../utils/errors.js";
import {
  createFamilyId, createOpaqueToken, createOtp, expiresInDays, expiresInSeconds,
  hashPassword, hashSecret, normalizeEmail, normalizePhone, verifyPassword
} from "../utils/security.js";
import { signAccessToken } from "../utils/tokens.js";

type ClientInfo = { ipAddress?: string; userAgent?: string };

function rolesAndPermissions(user: AuthUser): { roles: string[]; permissions: string[] } {
  const roles = user.roles.map((assignment) => assignment.role.code);
  const permissions = [...new Set(user.roles.flatMap((assignment) => assignment.role.permissions.map((grant) => grant.permission.code)))];
  return { roles, permissions };
}

function publicUser(user: AuthUser) {
  const authorization = rolesAndPermissions(user);
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    name: user.profile ? [user.profile.firstName, user.profile.middleName, user.profile.lastName].filter(Boolean).join(" ") : user.email,
    ...authorization,
    workerProfileId: user.workerProfile?.id ?? null
  };
}

function parseBirthday(value: string): Date {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [month, day, year] = value.split("/").map(Number);
    const date = new Date(Date.UTC(year!, month! - 1, day!));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month! - 1 || date.getUTCDate() !== day) throw new ConflictError("Birthday is invalid", "invalid_birthday");
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ConflictError("Birthday is invalid", "invalid_birthday");
  return date;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 100);
}

export class AuthService {
  private async issueTokens(user: AuthUser, client: ClientInfo, familyId = createFamilyId()) {
    const refreshToken = createOpaqueToken();
    const sessionId = randomUUID();
    const authorization = rolesAndPermissions(user);
    await authRepository.createSession({
      id: sessionId,
      userId: user.id,
      familyId,
      tokenHash: hashSecret(refreshToken),
      expiresAt: expiresInDays(env.REFRESH_TOKEN_TTL_DAYS),
      ...(client.ipAddress ? { ipAddress: client.ipAddress } : {}),
      ...(client.userAgent ? { userAgent: client.userAgent.slice(0, 500) } : {})
    });
    const accessToken = await signAccessToken({
      userId: user.id,
      sessionId,
      tokenVersion: user.tokenVersion,
      ...authorization
    });
    return { accessToken, refreshToken, expiresIn: env.ACCESS_TOKEN_TTL_SECONDS, sessionId };
  }

  async register(input: RegisterInput, client: ClientInfo) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.mobile);
    if (await authRepository.findByEmail(email) || await authRepository.findByPhone(phone)) throw new ConflictError("Email or mobile number is already registered", "account_exists");
    const parts = input.name.trim().split(/\s+/);
    const firstName = parts.shift()!;
    const lastName = parts.length ? parts.pop()! : firstName;
    const middleName = parts.join(" ") || undefined;
    const passwordHash = await hashPassword(input.password);
    const role = await prisma.role.findUniqueOrThrow({ where: { code: "customer" } });
    const user = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          email, phone, passwordHash, status: AccountStatus.ACTIVE,
          profile: { create: { firstName, middleName, lastName } },
          roles: { create: { roleId: role.id } },
          consents: {
            create: [
              { type: "terms", version: "1.0", ipAddress: client.ipAddress },
              { type: "privacy", version: "1.0", ipAddress: client.ipAddress }
            ]
          }
        }
      });
      const otp = createOtp();
      await transaction.otpChallenge.create({ data: { userId: created.id, purpose: OtpPurpose.PHONE_VERIFICATION, codeHash: hashSecret(otp), expiresAt: expiresInSeconds(env.OTP_TTL_SECONDS) } });
      const verificationToken = createOpaqueToken();
      await transaction.verificationToken.create({ data: { userId: created.id, purpose: TokenPurpose.EMAIL_VERIFICATION, tokenHash: hashSecret(verificationToken), expiresAt: expiresInSeconds(env.EMAIL_VERIFICATION_TTL_SECONDS) } });
      return { id: created.id, otp, verificationToken };
    });
    const authUser = await authRepository.findAuthUser(user.id);
    if (!authUser) throw new NotFoundError("Created user");
    await mailService.sendVerification(email,user.verificationToken);
    return {
      user: publicUser(authUser),
      ...(await this.issueTokens(authUser, client)),
      ...(env.NODE_ENV !== "production" ? { developmentOtp: user.otp, developmentEmailVerificationToken: user.verificationToken } : {})
    };
  }

  async registerWorker(input: WorkerRegistrationInput, client: ClientInfo) {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if (await authRepository.findByEmail(email) || await authRepository.findByPhone(phone)) throw new ConflictError("Email or mobile number is already registered", "account_exists");
    const passwordHash = await hashPassword(input.password);
    const [customerRole, workerRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: "customer" } }),
      prisma.role.findUniqueOrThrow({ where: { code: "worker" } })
    ]);
    const industryCode = slug(input.industryValue || input.industry);
    const existingIndustry = await prisma.industry.findUnique({ where: { code: industryCode } });
    const industry = existingIndustry ?? await prisma.industry.create({ data: { code: industryCode, name: input.industry, isActive: false } });
    const skillRows: Skill[] = [];
    for (const skillValue of input.skills) {
      const code = slug(skillValue);
      let skill = await prisma.skill.findUnique({ where: { industryId_code: { industryId: industry.id, code } } });
      skill ??= await prisma.skill.create({ data: { industryId: industry.id, code, name: skillValue, isActive: false } });
      skillRows.push(skill);
    }
    const gender = input.gender ? ({ male: Gender.MALE, female: Gender.FEMALE, other: Gender.OTHER } as const)[input.gender] : undefined;
    const userId = await prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          email, phone, passwordHash, status: AccountStatus.ACTIVE,
          profile: { create: { firstName: input.firstName, middleName: input.middleName || undefined, lastName: input.lastName, birthday: parseBirthday(input.birthday), gender } },
          roles: { create: [{ roleId: customerRole.id }, { roleId: workerRole.id }] },
          addresses: { create: { streetNumber: input.streetNumber, street: input.street, district: input.district, city: input.city, region: input.region, postalCode: input.postalCode, isDefault: true } },
          consents: { create: [
            { type: "information_accuracy", version: "1.0", ipAddress: client.ipAddress },
            { type: "privacy", version: "1.0", ipAddress: client.ipAddress },
            { type: "terms", version: "1.0", ipAddress: client.ipAddress }
          ] },
          workerProfile: {
            create: {
              industryId: industry.id,
              employmentType: input.employmentType === "employed" ? EmploymentType.EMPLOYED : EmploymentType.FREELANCE,
              verificationStatus: WorkerVerificationStatus.DRAFT,
              contactPerson: input.contactPerson,
              contactPhone: normalizePhone(input.contactPhone),
              skills: { create: skillRows.map((skill) => ({ skillId: skill.id })) },
              wallet: { create: {} }
            }
          }
        }
      });
      const otp = createOtp();
      await transaction.otpChallenge.create({ data: { userId: created.id, purpose: OtpPurpose.PHONE_VERIFICATION, codeHash: hashSecret(otp), expiresAt: expiresInSeconds(env.OTP_TTL_SECONDS) } });
      return { id: created.id, otp };
    });
    const authUser = await authRepository.findAuthUser(userId.id);
    if (!authUser) throw new NotFoundError("Created worker");
    const verificationToken=createOpaqueToken();await prisma.verificationToken.create({data:{userId:userId.id,purpose:TokenPurpose.EMAIL_VERIFICATION,tokenHash:hashSecret(verificationToken),expiresAt:expiresInSeconds(env.EMAIL_VERIFICATION_TTL_SECONDS)}});await mailService.sendVerification(email,verificationToken);
    return { user: publicUser(authUser), ...(await this.issueTokens(authUser, client)), ...(env.NODE_ENV !== "production" ? { developmentOtp: userId.otp,developmentEmailVerificationToken:verificationToken } : {}) };
  }

  async login(input: LoginInput, client: ClientInfo) {
    const login = input.emailOrPhone ?? input.email!;
    const user = login.includes("@") ? await authRepository.findByEmail(normalizeEmail(login)) : await authRepository.findByPhone(normalizePhone(login));
    if (!user || user.deletedAt || user.status !== AccountStatus.ACTIVE || !await verifyPassword(input.password, user.passwordHash)) {
      throw new AuthenticationError("Invalid email or password", "invalid_credentials");
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { user: publicUser(user), ...(await this.issueTokens(user, client)) };
  }

  async refresh(refreshToken: string, client: ClientInfo) {
    const session = await authRepository.findSessionByTokenHash(hashSecret(refreshToken));
    if (!session) throw new AuthenticationError("Invalid refresh token", "invalid_refresh_token");
    if (session.revokedAt) {
      await authRepository.revokeFamily(session.familyId);
      throw new AuthenticationError("Refresh token reuse detected; session family revoked", "refresh_token_reuse");
    }
    if (session.expiresAt <= new Date() || session.user.deletedAt || session.user.status !== AccountStatus.ACTIVE) {
      throw new AuthenticationError("Refresh token expired", "expired_refresh_token");
    }
    const newRefreshToken = createOpaqueToken();
    const newSessionId = randomUUID();
    await prisma.$transaction(async (transaction) => {
      await transaction.session.create({
        data: {
          id: newSessionId, userId: session.userId, familyId: session.familyId,
          tokenHash: hashSecret(newRefreshToken), expiresAt: expiresInDays(env.REFRESH_TOKEN_TTL_DAYS),
          ipAddress: client.ipAddress, userAgent: client.userAgent?.slice(0, 500)
        }
      });
      const updated = await transaction.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date(), replacedBySessionId: newSessionId, lastUsedAt: new Date() } });
      if (updated.count !== 1) throw new AuthenticationError("Refresh token was already used", "refresh_token_reuse");
    });
    const authorization = rolesAndPermissions(session.user);
    const accessToken = await signAccessToken({ userId: session.user.id, sessionId: newSessionId, tokenVersion: session.user.tokenVersion, ...authorization });
    return { user: publicUser(session.user), accessToken, refreshToken: newRefreshToken, expiresIn: env.ACCESS_TOKEN_TTL_SECONDS, sessionId: newSessionId };
  }

  async forgotPassword(emailInput: string) {
    const user = await authRepository.findByEmail(normalizeEmail(emailInput));
    if (!user || user.deletedAt) return {};
    await prisma.verificationToken.updateMany({ where: { userId: user.id, purpose: TokenPurpose.PASSWORD_RESET, consumedAt: null }, data: { consumedAt: new Date() } });
    const token = createOpaqueToken();
    await prisma.verificationToken.create({ data: { userId: user.id, purpose: TokenPurpose.PASSWORD_RESET, tokenHash: hashSecret(token), expiresAt: expiresInSeconds(env.RESET_TOKEN_TTL_SECONDS) } });
    await mailService.sendPasswordReset(user.email,token);
    return env.NODE_ENV !== "production" ? { developmentResetToken: token } : {};
  }

  async resetPassword(token: string, password: string) {
    const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hashSecret(token) } });
    if (!record || record.purpose !== TokenPurpose.PASSWORD_RESET || record.consumedAt || record.expiresAt <= new Date()) throw new AuthenticationError("Invalid or expired reset token", "invalid_reset_token");
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } } }),
      prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
  }

  async verifyEmail(token: string) {
    const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hashSecret(token) } });
    if (!record || record.purpose !== TokenPurpose.EMAIL_VERIFICATION || record.consumedAt || record.expiresAt <= new Date()) throw new AuthenticationError("Invalid or expired verification token", "invalid_verification_token");
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
    ]);
  }

  async resendEmailVerification(userId: string) {
    const user=await prisma.user.findUnique({where:{id:userId},select:{email:true,emailVerifiedAt:true}});if(!user)throw new NotFoundError("User");if(user.emailVerifiedAt)throw new ConflictError("Email is already verified","already_verified");
    const token = createOpaqueToken();
    await prisma.$transaction([
      prisma.verificationToken.updateMany({ where: { userId, purpose: TokenPurpose.EMAIL_VERIFICATION, consumedAt: null }, data: { consumedAt: new Date() } }),
      prisma.verificationToken.create({ data: { userId, purpose: TokenPurpose.EMAIL_VERIFICATION, tokenHash: hashSecret(token), expiresAt: expiresInSeconds(env.EMAIL_VERIFICATION_TTL_SECONDS) } })
    ]);
    await mailService.sendVerification(user.email,token);
    return env.NODE_ENV !== "production" ? { developmentEmailVerificationToken: token } : {};
  }

  async verifyPhone(userId: string, code: string) {
    const challenge = await prisma.otpChallenge.findFirst({ where: { userId, purpose: OtpPurpose.PHONE_VERIFICATION, consumedAt: null }, orderBy: { createdAt: "desc" } });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= challenge.maxAttempts) throw new AuthenticationError("OTP is invalid or expired", "invalid_otp");
    if (hashSecret(code) !== challenge.codeHash) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new AuthenticationError("OTP is invalid or expired", "invalid_otp");
    }
    await prisma.$transaction([
      prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } })
    ]);
  }

  async resendOtp(userId: string) {
    const latest = await prisma.otpChallenge.findFirst({ where: { userId, purpose: OtpPurpose.PHONE_VERIFICATION }, orderBy: { createdAt: "desc" } });
    if (latest && Date.now() - latest.createdAt.getTime() < 30_000) throw new ConflictError("Please wait before requesting another code", "otp_cooldown");
    const otp = createOtp();
    await prisma.otpChallenge.create({ data: { userId, purpose: OtpPurpose.PHONE_VERIFICATION, codeHash: hashSecret(otp), expiresAt: expiresInSeconds(env.OTP_TTL_SECONDS) } });
    return env.NODE_ENV !== "production" ? { developmentOtp: otp } : {};
  }

  async logout(sessionId: string) {
    await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async logoutAll(userId: string) {
    return authRepository.revokeUserSessions(userId);
  }
}

export const authService = new AuthService();
