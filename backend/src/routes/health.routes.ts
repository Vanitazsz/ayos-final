import { Router } from "express";
import { prisma } from "../config/database.js";
import { sendSuccess } from "../utils/response.js";

const router = Router();

router.get("/live", (_request, response) => sendSuccess(response, { status: "ok" }, "Live"));
router.get("/ready", async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  return sendSuccess(response, { status: "ready" }, "Ready");
});

export { router as healthRouter };
