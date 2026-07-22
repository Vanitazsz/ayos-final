import { z } from "zod";
import { paginationSchema } from "../utils/pagination.js";

export const userProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  middleName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  birthday: z.coerce.date().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  avatarUploadId: z.string().uuid().nullable().optional(),
  locale: z.string().trim().min(2).max(16).optional()
}).strict();

export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) }).strict();

export const addressSchema = z.object({
  label: z.string().trim().max(60).optional(),
  streetNumber: z.string().trim().max(50).optional(),
  street: z.string().trim().min(1).max(200),
  district: z.string().trim().max(150).optional(),
  city: z.string().trim().min(1).max(150),
  region: z.string().trim().min(1).max(150),
  postalCode: z.string().trim().max(20).optional(),
  countryCode: z.string().length(2).default("PH"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false)
}).strict();

export const addressUpdateSchema = addressSchema.partial().refine((value) => Object.keys(value).length > 0, "At least one field is required");
export const addressParamsSchema = z.object({ id: z.string().uuid() });
export const addressListSchema = paginationSchema;

export const consentSchema = z.object({
  infoAccurate: z.literal(true),
  agreePrivacy: z.literal(true),
  agreeTerms: z.literal(true),
  version: z.string().trim().min(1).max(32).default("1.0")
}).strict();

export const settingsSchema = z.record(z.string().regex(/^(notifications|privacy|security|locale)\.[a-zA-Z0-9_.-]+$/), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]));
export const providerParamsSchema = z.object({ providerId: z.string().uuid() });
export const identitySchema=z.object({uploadId:z.string().uuid(),type:z.string().trim().min(1).max(64).default("government_id"),side:z.enum(["front","back"]).optional()});
