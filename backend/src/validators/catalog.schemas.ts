import { z } from "zod";
import { paginationSchema } from "../utils/pagination.js";

export const catalogListSchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sort: z.enum(["name", "price_asc", "price_desc", "newest"]).default("name")
});

export const skillListSchema = z.object({ industry: z.string().trim().max(100).optional() });
export const idOrSlugParamsSchema = z.object({ id: z.string().trim().min(1).max(120) });

export const providerListSchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  skill: z.string().trim().max(120).optional(),
  verified: z.coerce.boolean().optional(),
  availability: z.enum(["ONLINE", "OFFLINE", "BUSY"]).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
  sort: z.enum(["rating", "distance", "price_asc", "price_desc", "experience"]).default("rating")
}).refine((value) => (value.lat === undefined) === (value.lng === undefined), { message: "lat and lng must be provided together", path: ["lat"] });

export const uuidParamsSchema = z.object({ id: z.string().uuid() });
export const availabilityQuerySchema = z.object({ from: z.coerce.date(), to: z.coerce.date() }).refine((value) => value.to > value.from, { message: "to must be after from", path: ["to"] });
