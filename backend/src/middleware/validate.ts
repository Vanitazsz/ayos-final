import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../utils/errors.js";

type RequestSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

function fieldErrors(error: any): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues ?? []) {
    const key = issue.path.length ? issue.path.join(".") : "request";
    result[key] ??= [];
    result[key].push(issue.message);
  }
  return result;
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(request.body);
        if (!parsed.success) throw new ValidationError(fieldErrors(parsed.error));
        request.body = parsed.data;
      }
      if (schemas.params) {
        const parsed = schemas.params.safeParse(request.params);
        if (!parsed.success) throw new ValidationError(fieldErrors(parsed.error));
        request.params = parsed.data as typeof request.params;
      }
      if (schemas.query) {
        const parsed = schemas.query.safeParse(request.query);
        if (!parsed.success) throw new ValidationError(fieldErrors(parsed.error));
        Object.defineProperty(request, "query", { value: parsed.data, writable: true, configurable: true, enumerable: true });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
