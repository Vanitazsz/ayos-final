import { z } from 'zod';
import { ACCOUNT_ROLES, BOOKING_STATUSES, PAYMENT_METHODS } from './enums.js';

export const emailSchema = z
  .string()
  .trim()
  .email({ message: 'Enter a valid email address.' })
  .max(254, { message: 'Email address must be 254 characters or fewer.' })
  .transform((value) => value.toLowerCase());
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, {
    message: 'Enter a mobile number with country code, for example +639171234567.',
  });
export const passwordSchema = z
  .string()
  .min(12, { message: 'Password must contain at least 12 characters.' })
  .max(128, { message: 'Password must contain 128 characters or fewer.' })
  .regex(/[a-z]/, { message: 'Password must include a lowercase letter.' })
  .regex(/[A-Z]/, { message: 'Password must include an uppercase letter.' })
  .regex(/\d/, { message: 'Password must include a number.' });

export const registerSchema = z
  .object({
    role: z.enum(ACCOUNT_ROLES).exclude(['ADMIN']),
    name: z
      .string()
      .trim()
      .min(2, { message: 'Full name must contain at least 2 characters.' })
      .max(120, { message: 'Full name must contain 120 characters or fewer.' }),
    mobile: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });

export const verifyOtpSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export const resendOtpSchema = z.object({ challengeId: z.string().uuid() });

export const signInSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetConfirmSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: passwordSchema,
});

export const refreshSessionSchema = z.object({ refreshToken: z.string().min(32).max(4096) });

export const serviceRequestSchema = z.object({
  serviceCategoryId: z.string().uuid(),
  description: z.string().trim().min(10).max(4000),
  addressId: z.string().uuid(),
  scheduledAt: z.coerce.date().refine((value) => value.getTime() > Date.now()),
  budget: z.coerce.number().positive().max(10_000_000),
  notes: z.string().trim().max(2000).optional(),
  mediaIds: z.array(z.string().uuid()).max(8).default([]),
});

export const bookingTransitionSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  reason: z.string().trim().min(3).max(1000).optional(),
  version: z.number().int().nonnegative(),
});

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  method: z.enum(PAYMENT_METHODS),
  idempotencyKey: z.string().min(16).max(128),
});

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  body: z.string().trim().min(3).max(4000),
  recommendWorker: z.boolean(),
  mediaIds: z.array(z.string().uuid()).max(5).default([]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
export type BookingTransitionInput = z.infer<typeof bookingTransitionSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
