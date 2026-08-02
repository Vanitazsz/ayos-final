import { Router } from "express";
import { workerController } from "../controllers/worker.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { availabilityQuerySchema, providerListSchema, uuidParamsSchema } from "../validators/catalog.schemas.js";
import { payoutMethodSchema, payoutSchema, workerAreasSchema, workerDocumentSchema, workerProfileUpdateSchema, workerSkillsSchema } from "../validators/worker.schemas.js";
import { paginationSchema } from "../utils/pagination.js";

export const providerRouter = Router();
providerRouter.get("/", validate({ query: providerListSchema }), workerController.providers);
providerRouter.get("/:id/availability", validate({ params: uuidParamsSchema, query: availabilityQuerySchema }), workerController.availability);
providerRouter.get("/:id", validate({ params: uuidParamsSchema }), workerController.provider);

export const workerRouter = Router();
workerRouter.use(authenticate, requireRole("worker"));
workerRouter.get("/me", workerController.me);
workerRouter.patch("/me", validate({ body: workerProfileUpdateSchema }), workerController.update);
workerRouter.put("/me/skills", validate({ body: workerSkillsSchema }), workerController.skills);
workerRouter.put("/me/service-areas", validate({ body: workerAreasSchema }), workerController.areas);
workerRouter.post("/me/submit", workerController.submit);
workerRouter.get("/me/verification", workerController.verification);
workerRouter.get("/me/dashboard", workerController.dashboard);
workerRouter.post("/me/documents",validate({body:workerDocumentSchema}),workerController.document);
workerRouter.get("/me/wallet",workerController.wallet);
workerRouter.get("/me/wallet/transactions",validate({query:paginationSchema}),workerController.walletTransactions);
workerRouter.get("/me/payout-methods",workerController.payoutMethods);
workerRouter.post("/me/payout-methods",validate({body:payoutMethodSchema}),workerController.createPayoutMethod);
workerRouter.get("/me/payouts",validate({query:paginationSchema}),workerController.payouts);
workerRouter.post("/me/payouts",validate({body:payoutSchema}),workerController.createPayout);
