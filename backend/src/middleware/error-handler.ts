import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { Prisma } from "../generated/prisma/client.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found",
    code: "route_not_found",
    requestId: request.requestId
  });
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.status).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.errors ? { errors: error.errors } : {}),
      ...(error.details !== undefined ? { details: error.details } : {}),
      requestId: request.requestId
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 422;
    response.status(status).json({ success: false, message: error.message, code: error.code.toLowerCase(), requestId: request.requestId });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({ success: false, message: "A record with those values already exists", code: "unique_conflict", requestId: request.requestId });
      return;
    }
    if (error.code === "P2025") {
      response.status(404).json({ success: false, message: "Resource not found", code: "not_found", requestId: request.requestId });
      return;
    }
  }

  logger.error({ err: error, requestId: request.requestId }, "Unhandled request error");
  response.status(500).json({ success: false, message: "Internal server error", code: "internal_error", requestId: request.requestId });
};
