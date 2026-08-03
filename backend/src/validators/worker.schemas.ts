import { z } from "zod";

export const workerProfileUpdateSchema = z.object({
  bio: z.string().trim().max(2000).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  hourlyRate: z.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  availabilityStatus: z.enum(["ONLINE", "OFFLINE", "BUSY"]).optional(),
  contactPerson: z.string().trim().max(150).nullable().optional(),
  contactPhone: z.string().trim().regex(/^(09|\+639)\d{9}$/).nullable().optional()
}).strict();

export const workerSkillsSchema = z.object({ skills: z.array(z.string().trim().min(1).max(120)).min(1).max(30) }).strict();
export const workerAreasSchema = z.object({
  areas: z.array(z.object({
    label: z.string().trim().min(1).max(150),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().positive().max(100).optional()
  }).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), "latitude and longitude must be paired")).max(30)
}).strict();
export const workerDocumentSchema=z.object({uploadId:z.string().uuid(),type:z.string().trim().min(1).max(64),side:z.enum(["front","back"]).optional()});
export const payoutMethodSchema=z.object({type:z.string().trim().min(1).max(32),provider:z.string().trim().min(1).max(64),providerToken:z.string().trim().min(1).max(255),label:z.string().trim().min(1).max(100),accountMask:z.string().trim().min(1).max(100),setDefault:z.boolean().default(false)});
export const payoutSchema=z.object({amount:z.number().int().positive(),currency:z.string().length(3).default("PHP"),payoutMethodId:z.string().uuid(),idempotencyKey:z.string().trim().min(8).max(128)});
