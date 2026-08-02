import { z } from "zod";

const email = z.string().trim().email().max(320);
const phPhone = z.string().trim().regex(/^(09|\+639)\d{9}$/, "Use a valid Philippine mobile number");
const strongPassword = z.string().min(8).max(128)
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/\d/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(200),
  mobile: phPhone,
  email,
  password: strongPassword,
  acceptedTerms: z.literal(true)
}).strict();

export const workerRegistrationSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional().default(""),
  lastName: z.string().trim().min(1).max(100),
  email,
  phone: phPhone,
  birthday: z.string().trim().min(8).max(10),
  gender: z.enum(["male", "female", "other"]).optional(),
  password: strongPassword,
  industry: z.string().trim().min(1).max(100),
  industryValue: z.string().trim().max(100).optional(),
  employmentType: z.enum(["employed", "freelance"]),
  skills: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  streetNumber: z.string().trim().max(50).optional(),
  street: z.string().trim().min(1).max(200),
  district: z.string().trim().max(150).optional(),
  city: z.string().trim().min(1).max(150),
  region: z.string().trim().min(1).max(150),
  postalCode: z.string().trim().max(20).optional(),
  contactPerson: z.string().trim().min(1).max(150),
  contactPhone: phPhone,
  infoAccurate: z.literal(true),
  agreePrivacy: z.literal(true),
  agreeTerms: z.literal(true)
}).strict();

export const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(3).max(320).optional(),
  email: z.string().trim().min(3).max(320).optional(),
  password: z.string().min(1).max(128)
}).strict().refine((value) => Boolean(value.emailOrPhone || value.email), { message: "Email or phone is required", path: ["emailOrPhone"] });

export const refreshSchema = z.object({ refreshToken: z.string().min(32).max(500).optional() }).strict();
export const forgotPasswordSchema = z.object({ email }).strict();
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(500), password: strongPassword, confirmPassword: z.string() }).strict()
  .refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export const tokenSchema = z.object({ token: z.string().min(32).max(500) }).strict();
export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
export const sessionParamsSchema = z.object({ id: z.string().uuid() });

export type RegisterInput = z.infer<typeof registerSchema>;
export type WorkerRegistrationInput = z.infer<typeof workerRegistrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
