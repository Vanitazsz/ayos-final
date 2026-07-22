import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  addressListSchema, addressParamsSchema, addressSchema, addressUpdateSchema, consentSchema,
  deleteAccountSchema, identitySchema, providerParamsSchema, settingsSchema, userProfileSchema
} from "../validators/user.schemas.js";

const router = Router();
router.use(authenticate);
router.get("/me", userController.me);
router.patch("/me", validate({ body: userProfileSchema }), userController.updateProfile);
router.delete("/me", validate({ body: deleteAccountSchema }), userController.deleteAccount);
router.get("/me/addresses", requireRole("customer"), validate({ query: addressListSchema }), userController.addresses);
router.post("/me/addresses", requireRole("customer"), validate({ body: addressSchema }), userController.createAddress);
router.patch("/me/addresses/:id", requireRole("customer"), validate({ params: addressParamsSchema, body: addressUpdateSchema }), userController.updateAddress);
router.delete("/me/addresses/:id", requireRole("customer"), validate({ params: addressParamsSchema }), userController.deleteAddress);
router.get("/me/settings", userController.settings);
router.patch("/me/settings", validate({ body: settingsSchema }), userController.updateSettings);
router.get("/me/favorites", requireRole("customer"), userController.favorites);
router.post("/me/favorites/:providerId", requireRole("customer"), validate({ params: providerParamsSchema }), userController.addFavorite);
router.delete("/me/favorites/:providerId", requireRole("customer"), validate({ params: providerParamsSchema }), userController.removeFavorite);

export { router as userRouter };

export const userCompatibilityRouter = Router();
userCompatibilityRouter.use(authenticate, requireRole("customer"));
userCompatibilityRouter.put("/location", validate({ body: addressSchema.omit({ label: true, isDefault: true, countryCode: true }) }), userController.setLocation);
userCompatibilityRouter.post("/consent", validate({ body: consentSchema }), userController.consent);
userCompatibilityRouter.post("/verify-identity",validate({body:identitySchema}),userController.identity);
