import { prisma } from "../config/database.js";
import type { Prisma } from "../generated/prisma/client.js";
import { ConflictError, NotFoundError, AuthenticationError } from "../utils/errors.js";
import { verifyPassword } from "../utils/security.js";
import { pagination, paginationMeta } from "../utils/pagination.js";

export class UserService {
  async me(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true, email: true, phone: true, status: true, emailVerifiedAt: true, phoneVerifiedAt: true,
        createdAt: true, profile: true, workerProfile: { select: { id: true, verificationStatus: true, availabilityStatus: true } },
        roles: { select: { role: { select: { code: true, name: true } } } }, settings: true
      }
    });
    if (!user) throw new NotFoundError("User");
    return { ...user, roles: user.roles.map((entry) => entry.role) };
  }

  async updateProfile(userId: string, data: Prisma.ProfileUncheckedUpdateInput) {
    if (data.avatarUploadId) {
      const upload = await prisma.upload.findFirst({ where: { id: String(data.avatarUploadId), ownerId: userId, purpose: "avatar", deletedAt: null } });
      if (!upload) throw new NotFoundError("Avatar upload");
    }
    return prisma.profile.update({ where: { userId }, data });
  }

  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !await verifyPassword(password, user.passwordHash)) throw new AuthenticationError("Password is incorrect", "invalid_credentials");
    const now = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: userId }, data: { deletedAt: now, status: "DISABLED", tokenVersion: { increment: 1 } } });
      await transaction.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
      await transaction.deletionRecord.create({ data: { entityType: "User", entityId: userId, displayName: user.email, deletedById: userId, purgeAfter: new Date(now.getTime() + 30 * 86400000) } });
    });
  }

  async listAddresses(userId: string, page: number, limit: number) {
    const where = { userId, deletedAt: null };
    const [items, total] = await prisma.$transaction([
      prisma.address.findMany({ where, ...pagination(page, limit), orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
      prisma.address.count({ where })
    ]);
    return { items, meta: paginationMeta(page, limit, total) };
  }

  async createAddress(userId: string, data: Prisma.AddressUncheckedCreateWithoutUserInput) {
    return prisma.$transaction(async (transaction) => {
      if (data.isDefault) await transaction.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return transaction.address.create({ data: { ...data, userId } });
    });
  }

  async updateAddress(userId: string, id: string, data: Prisma.AddressUpdateInput) {
    const address = await prisma.address.findFirst({ where: { id, userId, deletedAt: null } });
    if (!address) throw new NotFoundError("Address");
    return prisma.$transaction(async (transaction) => {
      if (data.isDefault === true) await transaction.address.updateMany({ where: { userId, isDefault: true, id: { not: id } }, data: { isDefault: false } });
      return transaction.address.update({ where: { id }, data });
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await prisma.address.findFirst({ where: { id, userId, deletedAt: null } });
    if (!address) throw new NotFoundError("Address");
    if (address.isDefault) throw new ConflictError("Set another default address before deleting this one", "default_address");
    await prisma.address.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async setLocation(userId: string, data: Prisma.AddressUncheckedCreateWithoutUserInput) {
    const current = await prisma.address.findFirst({ where: { userId, isDefault: true, deletedAt: null } });
    if (current) return this.updateAddress(userId, current.id, data);
    return this.createAddress(userId, { ...data, isDefault: true });
  }

  async recordConsent(userId: string, input: { version: string }, ipAddress?: string) {
    const rows = ["information_accuracy", "privacy", "terms"];
    await prisma.$transaction(rows.map((type) => prisma.consent.upsert({
      where: { userId_type_version: { userId, type, version: input.version } },
      update: { acceptedAt: new Date(), ipAddress },
      create: { userId, type, version: input.version, ipAddress }
    })));
    return { accepted: rows };
  }

  async settings(userId: string) {
    const rows = await prisma.userSetting.findMany({ where: { userId } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async updateSettings(userId: string, values: Record<string, unknown>) {
    await prisma.$transaction(Object.entries(values).map(([key, value]) => prisma.userSetting.upsert({
      where: { userId_key: { userId, key } }, update: { value: value as any }, create: { userId, key, value: value as any }
    })));
    return this.settings(userId);
  }

  async addIdentityDocument(userId:string,input:{uploadId:string;type:string;side?:string}){const upload=await prisma.upload.findFirst({where:{id:input.uploadId,ownerId:userId,purpose:"identity",status:"ACTIVE",deletedAt:null}});if(!upload)throw new NotFoundError("Identity upload");return prisma.$transaction(async tx=>{const document=await tx.verificationDocument.create({data:{userId,uploadId:input.uploadId,type:input.type,side:input.side}});await tx.upload.update({where:{id:input.uploadId},data:{attachedAt:new Date()}});return document})}

  async listFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      include: { provider: { include: { profile: true, workerProfile: { include: { industry: true } } } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async addFavorite(userId: string, providerId: string) {
    const provider = await prisma.user.findFirst({ where: { id: providerId, workerProfile: { verificationStatus: "APPROVED" }, deletedAt: null } });
    if (!provider) throw new NotFoundError("Provider");
    return prisma.favorite.upsert({ where: { userId_providerId: { userId, providerId } }, update: {}, create: { userId, providerId } });
  }

  async removeFavorite(userId: string, providerId: string) {
    await prisma.favorite.deleteMany({ where: { userId, providerId } });
  }
}

export const userService = new UserService();
