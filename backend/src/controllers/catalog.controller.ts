import type { Request, Response } from "express";
import { catalogService } from "../services/catalog.service.js";
import { sendSuccess } from "../utils/response.js";

export const catalogController = {
  categories: async (request: Request, response: Response) => sendSuccess(response, await catalogService.categories(request.query as never)),
  services: async (request: Request, response: Response) => sendSuccess(response, await catalogService.services(request.query as never)),
  service: async (request: Request, response: Response) => sendSuccess(response, await catalogService.service(String(request.params.id))),
  industries: async (_request: Request, response: Response) => sendSuccess(response, await catalogService.industries()),
  skills: async (request: Request, response: Response) => sendSuccess(response, await catalogService.skills(request.query.industry as string | undefined))
};
