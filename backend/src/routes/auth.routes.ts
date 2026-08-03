import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema, loginSchema, otpSchema, refreshSchema, registerSchema,
  resetPasswordSchema, sessionParamsSchema, tokenSchema, workerRegistrationSchema
} from "../validators/auth.schemas.js";

const router = Router();
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts", code: "rate_limited" }
});

router.post("/register", limiter, validate({ body: registerSchema }), authController.register);
router.post("/register-worker", limiter, validate({ body: workerRegistrationSchema }), authController.registerWorker);
router.post("/login", limiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", limiter, validate({ body: refreshSchema }), authController.refresh);
router.post("/forgot-password", limiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post("/reset-password", limiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post("/verify-email", limiter, validate({ body: tokenSchema }), authController.verifyEmail);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.post("/resend-verification", limiter, authenticate, authController.resendVerification);
router.post("/verify-phone", limiter, authenticate, validate({ body: otpSchema }), authController.verifyPhone);
router.post("/resend-otp", limiter, authenticate, authController.resendOtp);
router.get("/sessions", authenticate, authController.sessions);
router.delete("/sessions/:id", authenticate, validate({ params: sessionParamsSchema }), authController.revokeSession);

export { router as authRouter };
