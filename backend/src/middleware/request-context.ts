import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (request, response, next) => {
  const incoming = request.get("x-request-id");
  request.requestId = incoming && /^[A-Za-z0-9._:-]{1,100}$/.test(incoming) ? incoming : randomUUID();
  response.setHeader("x-request-id", request.requestId);
  next();
};
