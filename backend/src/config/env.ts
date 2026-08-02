import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess((value) => value === "" ? undefined : value, z.string().optional());
const booleanString = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return value;
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  APP_BASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(180).default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(16).default(12),
  TRUST_PROXY: booleanString.default(false),
  REQUEST_BODY_LIMIT: z.string().default("1mb"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1024).max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  UPLOAD_ROOT: z.string().min(1).default("./uploads"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  COOKIE_SECURE: booleanString.default(false),
  COOKIE_DOMAIN: optionalString,
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  RESET_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(86400).default(1800),
  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce.number().int().min(900).max(604800).default(86400),
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: booleanString.default(false),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: z.string().email().default("no-reply@a-yos.local"),
  PAYMENT_PROVIDER: z.string().default("disabled"),
  PAYMENT_WEBHOOK_SECRET: optionalString,
  AI_PROVIDER: z.string().default("deterministic"),
  AI_API_KEY: optionalString,
  REDIS_URL: optionalString,
  S3_ENDPOINT: optionalString,
  S3_REGION: optionalString,
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`environment_validation_error: ${issues}`);
}

if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_ACCESS_SECRET.includes("replace")) {
  throw new Error("environment_validation_error: JWT_ACCESS_SECRET must be replaced in production");
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
};

export type Environment = typeof env;
