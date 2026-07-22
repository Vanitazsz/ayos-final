import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { AccountStatus } from "../generated/prisma/client.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/tokens.js";

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const header = request.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new AuthenticationError();
    const context = await verifyAccessToken(header.slice(7));
    const session = await prisma.session.findUnique({
      where: { id: context.sessionId },
      include: { user: { select: { id: true, status: true, tokenVersion: true, deletedAt: true } } }
    });
    if (!session || session.userId !== context.userId || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AuthenticationError("Session is no longer active", "inactive_session");
    }
    if (session.user.status !== AccountStatus.ACTIVE || session.user.deletedAt || session.user.tokenVersion !== context.tokenVersion) {
      throw new AuthenticationError("Account is not active", "inactive_account");
    }
    request.auth = context;
    next();
  } catch (error) {
    next(error);
  }
};

export function requirePermission(...permissions: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) return next(new AuthenticationError());
    if (request.auth.roles.includes("super_admin") || permissions.every((permission) => request.auth!.permissions.includes(permission))) {
      return next();
    }
    return next(new AuthorizationError());
  };
}

export function requireRole(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) return next(new AuthenticationError());
    if (request.auth.roles.includes("super_admin") || roles.some((role) => request.auth!.roles.includes(role))) return next();
    return next(new AuthorizationError());
  };
}
