import { z } from "zod";
import { paginationSchema } from "../utils/pagination.js";

const uuid = z.string().uuid();
export const requestParamsSchema = z.object({ id: uuid });
export const requestListSchema = paginationSchema.extend({
  status: z.enum(["DRAFT", "SEARCHING", "POSTED", "SCHEDULED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "PENDING_CONFIRMATION", "COMPLETED", "CANCELLED"]).optional(),
  urgency: z.enum(["ASAP", "THIS_WEEK", "OPEN_BIDDING"]).optional(),
  search: z.string().trim().max(100).optional()
});
const location = z.object({ addressText: z.string().trim().min(1).max(500), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional() }).refine((v) => (v.latitude === undefined) === (v.longitude === undefined), "latitude and longitude must be paired");
const requestFieldsSchema = z.object({
  categoryId: uuid, serviceId: uuid.optional(), description: z.string().trim().min(10).max(5000), addressId: uuid.optional(), location: location.optional(),
  radiusKm: z.number().positive().max(100).optional(), budgetMin: z.number().int().nonnegative().optional(), budgetMax: z.number().int().positive().optional(),
  currency: z.string().length(3).default("PHP"), hasParts: z.boolean().optional(), partsDescription: z.string().trim().max(1000).optional(), attachmentIds: z.array(uuid).max(10).default([])
});
export const requestCreateSchema = requestFieldsSchema.refine((v) => v.budgetMin === undefined || v.budgetMax === undefined || v.budgetMin <= v.budgetMax, { path: ["budgetMax"], message: "budgetMax must be at least budgetMin" });
export const requestUpdateSchema = requestFieldsSchema.partial().extend({ version: z.number().int().positive() }).refine((v) => v.budgetMin === undefined || v.budgetMax === undefined || v.budgetMin <= v.budgetMax, { path: ["budgetMax"], message: "budgetMax must be at least budgetMin" });
export const publishSchema = z.object({ urgency: z.enum(["ASAP", "THIS_WEEK", "OPEN_BIDDING"]), scheduledAt: z.coerce.date().optional(), paymentMethodId: uuid.optional() });
export const matchSchema = z.object({ radiusKm: z.number().positive().max(100).optional(), limit: z.number().int().min(1).max(50).default(20) });
export const bidSchema = z.object({ message: z.string().trim().min(1).max(2000), minAmount: z.number().int().nonnegative(), maxAmount: z.number().int().positive(), currency: z.string().length(3).default("PHP") }).refine((v) => v.minAmount <= v.maxAmount, { path: ["maxAmount"], message: "maxAmount must be at least minAmount" });
export const bidUpdateSchema=z.object({message:z.string().trim().min(1).max(2000).optional(),minAmount:z.number().int().nonnegative().optional(),maxAmount:z.number().int().positive().optional(),currency:z.string().length(3).optional()});
export const selectWorkerSchema = z.object({ workerId: uuid, bidId: uuid.optional() });

export const bookingCreateSchema = z.object({ providerId: uuid, serviceId: uuid.optional(), scheduledAt: z.coerce.date(), addressText: z.string().trim().min(1).max(500), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), notes: z.string().trim().max(2000).optional(), hasParts: z.boolean().optional(), partsDescription: z.string().trim().max(1000).optional() });
export const bookingListSchema = paginationSchema.extend({ status: z.string().max(40).optional(), search: z.string().trim().max(100).optional() });
export const transitionSchema = z.object({ action: z.enum(["accept", "decline", "confirm_details", "en_route", "arrive", "start", "complete", "confirm_completion"]), version: z.number().int().positive().optional(), idempotencyKey: z.string().max(128).optional() });
export const cancelSchema = z.object({ stage: z.enum(["BEFORE_TRAVELING", "AFTER_ARRIVING", "AFTER_INSPECTING"]), reasonId: z.string().trim().min(1).max(20), customReason: z.string().trim().max(1000).optional(), notes: z.string().trim().max(2000).optional() });
export const bookingUpdateSchema=bookingCreateSchema.omit({providerId:true,serviceId:true}).partial().extend({version:z.number().int().positive()});
