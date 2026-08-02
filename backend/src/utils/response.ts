import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(response: Response, data: T, message = "Request completed", status = 200): Response {
  return response.status(status).json({ success: true, message, data });
}

export function sendNoContent(response: Response): Response {
  return response.status(204).send();
}

export function paginated<T>(items: T[], meta: PaginationMeta): { items: T[]; meta: PaginationMeta } {
  return { items, meta };
}
