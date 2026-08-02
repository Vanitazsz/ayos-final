import type { Request } from "express";
import { prisma } from "../config/database.js";
import { AuditOutcome } from "../generated/prisma/client.js";

type AuditInput = {
  action: string;
  module: string;
  outcome?: AuditOutcome;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(request: Request, input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: request.auth?.userId,
      sessionId: request.auth?.sessionId,
      requestId: request.requestId,
      action: input.action,
      module: input.module,
      outcome: input.outcome ?? AuditOutcome.SUCCESS,
      targetType: input.targetType,
      targetId: input.targetId,
      ipAddress: request.ip,
      userAgent: request.get("user-agent")?.slice(0, 500),
      metadata: input.metadata as any
    }
  });
}
