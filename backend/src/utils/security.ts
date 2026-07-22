import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s()-]/g, "");
  if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
  if (/^639\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

export const hashSecret = (value: string): string => createHash("sha256").update(value).digest("hex");
export const createOpaqueToken = (): string => randomBytes(48).toString("base64url");
export const createFamilyId = (): string => randomUUID();
export const createOtp = (): string => randomInt(0, 1_000_000).toString().padStart(6, "0");
export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, env.BCRYPT_ROUNDS);
export const verifyPassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);

export function expiresInSeconds(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export function expiresInDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
