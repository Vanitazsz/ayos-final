import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { AuthorizationError } from "../utils/errors.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const originGuard: RequestHandler = (request, _response, next) => {
  if (safeMethods.has(request.method) || !request.headers.cookie) return next();
  const origin = request.get("origin");
  if (!origin || !env.corsOrigins.includes(origin)) return next(new AuthorizationError("Untrusted request origin"));
  return next();
};
