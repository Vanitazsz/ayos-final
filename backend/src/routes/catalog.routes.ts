import { Router } from "express";
import { catalogController } from "../controllers/catalog.controller.js";
import { validate } from "../middleware/validate.js";
import { catalogListSchema, idOrSlugParamsSchema, skillListSchema } from "../validators/catalog.schemas.js";

const router = Router();
router.get("/categories", validate({ query: catalogListSchema }), catalogController.categories);
router.get("/services", validate({ query: catalogListSchema }), catalogController.services);
router.get("/services/:id", validate({ params: idOrSlugParamsSchema }), catalogController.service);
router.get("/industries", catalogController.industries);
router.get("/skills", validate({ query: skillListSchema }), catalogController.skills);

export { router as catalogRouter };
