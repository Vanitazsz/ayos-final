import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
import type { AuthContext } from "../types/security.js";
import { AuthenticationError } from "./errors.js";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const issuer = "ayos-api";
const audience = "ayos-clients";

export async function signAccessToken(context: AuthContext): Promise<string> {
  return new SignJWT({
    sid: context.sessionId,
    tv: context.tokenVersion,
    roles: context.roles,
    permissions: context.permissions
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(context.userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer, audience, algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.sid !== "string" || typeof payload.tv !== "number") {
      throw new Error("Malformed token claims");
    }
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      tokenVersion: payload.tv,
      roles: Array.isArray(payload.roles) ? payload.roles.filter((value): value is string => typeof value === "string") : [],
      permissions: Array.isArray(payload.permissions) ? payload.permissions.filter((value): value is string => typeof value === "string") : []
    };
  } catch {
    throw new AuthenticationError("Invalid or expired access token", "invalid_access_token");
  }
}
