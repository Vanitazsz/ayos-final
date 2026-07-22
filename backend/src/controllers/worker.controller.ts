import type { Request, Response } from "express";
import { workerService } from "../services/worker.service.js";
import { sendSuccess } from "../utils/response.js";

export const workerController = {
  providers: async (request: Request, response: Response) => sendSuccess(response, await workerService.providers(request.query as never)),
  provider: async (request: Request, response: Response) => sendSuccess(response, await workerService.provider(String(request.params.id))),
  availability: async (request: Request, response: Response) => sendSuccess(response, await workerService.availability(String(request.params.id), new Date(String(request.query.from)), new Date(String(request.query.to)))),
  me: async (request: Request, response: Response) => sendSuccess(response, await workerService.me(request.auth!.userId)),
  update: async (request: Request, response: Response) => sendSuccess(response, await workerService.update(request.auth!.userId, request.body), "Worker profile updated"),
  skills: async (request: Request, response: Response) => sendSuccess(response, await workerService.replaceSkills(request.auth!.userId, request.body.skills), "Skills updated"),
  areas: async (request: Request, response: Response) => sendSuccess(response, await workerService.replaceAreas(request.auth!.userId, request.body.areas), "Service areas updated"),
  submit: async (request: Request, response: Response) => sendSuccess(response, await workerService.submit(request.auth!.userId), "Application submitted"),
  verification: async (request: Request, response: Response) => sendSuccess(response, await workerService.verification(request.auth!.userId)),
  dashboard: async (request: Request, response: Response) => sendSuccess(response, await workerService.dashboard(request.auth!.userId))
  ,document:async(request:Request,response:Response)=>sendSuccess(response,await workerService.addDocument(request.auth!.userId,request.body),"Document attached",201)
  ,wallet:async(request:Request,response:Response)=>sendSuccess(response,await workerService.wallet(request.auth!.userId))
  ,walletTransactions:async(request:Request,response:Response)=>sendSuccess(response,await workerService.walletTransactions(request.auth!.userId,Number(request.query.page),Number(request.query.limit)))
  ,payoutMethods:async(request:Request,response:Response)=>sendSuccess(response,await workerService.payoutMethods(request.auth!.userId))
  ,createPayoutMethod:async(request:Request,response:Response)=>sendSuccess(response,await workerService.createPayoutMethod(request.auth!.userId,request.body),"Payout method created",201)
  ,payouts:async(request:Request,response:Response)=>sendSuccess(response,await workerService.payouts(request.auth!.userId,Number(request.query.page),Number(request.query.limit)))
  ,createPayout:async(request:Request,response:Response)=>sendSuccess(response,await workerService.createPayout(request.auth!.userId,request.body),"Payout requested",201)
};
