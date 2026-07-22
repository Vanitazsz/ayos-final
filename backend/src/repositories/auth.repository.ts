import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../config/database.js";

const authenticationInclude = {
  profile: true,
  workerProfile: true,
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } }
        }
      }
    }
  }
} satisfies Prisma.UserInclude;

export class AuthRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: authenticationInclude });
  }

  findByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone }, include: authenticationInclude });
  }

  findAuthUser(id: string) {
    return prisma.user.findUnique({ where: { id }, include: authenticationInclude });
  }

  findSessionByTokenHash(tokenHash: string) {
    return prisma.session.findUnique({ where: { tokenHash }, include: { user: { include: authenticationInclude } } });
  }

  createSession(data: Prisma.SessionUncheckedCreateInput) {
    return prisma.session.create({ data });
  }

  revokeSession(id: string, replacedBySessionId?: string) {
    return prisma.session.update({
      where: { id },
      data: { revokedAt: new Date(), ...(replacedBySessionId ? { replacedBySessionId } : {}) }
    });
  }

  revokeFamily(familyId: string) {
    return prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  revokeUserSessions(userId: string) {
    return prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}

export type AuthUser = NonNullable<Awaited<ReturnType<AuthRepository["findAuthUser"]>>>;
export const authRepository = new AuthRepository();
