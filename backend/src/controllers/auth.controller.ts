import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";
import { AuthenticationError, NotFoundError } from "../utils/errors.js";

function clientInfo(request: Request) {
  return { ipAddress: request.ip, userAgent: request.get("user-agent") };
}

function setRefreshCookie(response: Response, refreshToken: string): void {
  response.cookie("ayos_refresh", refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
  });
}

export const authController = {
  register: async (request: Request, response: Response) => {
    const result = await authService.register(request.body, clientInfo(request));
    setRefreshCookie(response, result.refreshToken);
    return sendSuccess(response, result, "Registration successful", 201);
  },

  registerWorker: async (request: Request, response: Response) => {
    const result = await authService.registerWorker(request.body, clientInfo(request));
    setRefreshCookie(response, result.refreshToken);
    return sendSuccess(response, result, "Worker registration created", 201);
  },

  login: async (request: Request, response: Response) => {
    const result = await authService.login(request.body, clientInfo(request));
    setRefreshCookie(response, result.refreshToken);
    return sendSuccess(response, result, "Login successful");
  },

  refresh: async (request: Request, response: Response) => {
    const token = request.body.refreshToken ?? request.cookies?.ayos_refresh;
    if (!token) throw new AuthenticationError("Refresh token is required", "missing_refresh_token");
    const result = await authService.refresh(token, clientInfo(request));
    setRefreshCookie(response, result.refreshToken);
    return sendSuccess(response, result, "Session refreshed");
  },

  logout: async (request: Request, response: Response) => {
    await authService.logout(request.auth!.sessionId);
    response.clearCookie("ayos_refresh", { path: "/api/v1/auth" });
    return sendSuccess(response, {}, "Logged out");
  },

  logoutAll: async (request: Request, response: Response) => {
    const result = await authService.logoutAll(request.auth!.userId);
    response.clearCookie("ayos_refresh", { path: "/api/v1/auth" });
    return sendSuccess(response, { revoked: result.count }, "All sessions revoked");
  },

  forgotPassword: async (request: Request, response: Response) => {
    const development = await authService.forgotPassword(request.body.email);
    return sendSuccess(response, development, "If the account exists, a reset link has been sent");
  },

  resetPassword: async (request: Request, response: Response) => {
    await authService.resetPassword(request.body.token, request.body.password);
    return sendSuccess(response, {}, "Password reset successful");
  },

  verifyEmail: async (request: Request, response: Response) => {
    await authService.verifyEmail(request.body.token);
    return sendSuccess(response, {}, "Email verified");
  },

  resendVerification: async (request: Request, response: Response) => {
    const result = await authService.resendEmailVerification(request.auth!.userId);
    return sendSuccess(response, result, "Verification email requested");
  },

  verifyPhone: async (request: Request, response: Response) => {
    await authService.verifyPhone(request.auth!.userId, request.body.code);
    return sendSuccess(response, {}, "Phone verified");
  },

  resendOtp: async (request: Request, response: Response) => {
    const result = await authService.resendOtp(request.auth!.userId);
    return sendSuccess(response, result, "Verification code requested");
  },

  sessions: async (request: Request, response: Response) => {
    const sessions = await prisma.session.findMany({
      where: { userId: request.auth!.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true, ipAddress: true, userAgent: true },
      orderBy: { createdAt: "desc" }
    });
    return sendSuccess(response, sessions);
  },

  revokeSession: async (request: Request, response: Response) => {
    const session = await prisma.session.findFirst({ where: { id: String(request.params.id), userId: request.auth!.userId } });
    if (!session) throw new NotFoundError("Session");
    await authService.logout(session.id);
    return sendSuccess(response, {}, "Session revoked");
  }
};
