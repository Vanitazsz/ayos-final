import type { Request, Response } from "express";
import { requestBookingService as service } from "../services/request-booking.service.js";
import { sendNoContent, sendSuccess } from "../utils/response.js";

export const requestController = {
  list: async (r:Request,s:Response)=>sendSuccess(s,await service.requests(r.auth!.userId,r.auth!.roles,r.query as never)),
  create: async (r:Request,s:Response)=>sendSuccess(s,await service.create(r.auth!.userId,r.body),"Request created",201),
  detail: async (r:Request,s:Response)=>sendSuccess(s,await service.detail(r.auth!.userId,r.auth!.roles,String(r.params.id))),
  update: async (r:Request,s:Response)=>sendSuccess(s,await service.update(r.auth!.userId,String(r.params.id),r.body),"Request updated"),
  remove: async (r:Request,s:Response)=>{await service.remove(r.auth!.userId,String(r.params.id));return sendNoContent(s)},
  analyze: async (r:Request,s:Response)=>sendSuccess(s,await service.analyze(r.auth!.userId,String(r.params.id)),"Request analyzed",201),
  publish: async (r:Request,s:Response)=>sendSuccess(s,await service.publish(r.auth!.userId,String(r.params.id),r.body),"Request published"),
  matches: async (r:Request,s:Response)=>sendSuccess(s,(await service.detail(r.auth!.userId,r.auth!.roles,String(r.params.id))).matches),
  generateMatches: async (r:Request,s:Response)=>sendSuccess(s,await service.generateMatches(r.auth!.userId,r.auth!.roles,String(r.params.id),r.body.limit),"Matches generated",201),
  bids: async (r:Request,s:Response)=>sendSuccess(s,await service.bids(r.auth!.userId,r.auth!.roles,String(r.params.id))),
  bid: async (r:Request,s:Response)=>sendSuccess(s,await service.bid(r.auth!.userId,String(r.params.id),r.body),"Bid submitted",201),
  select: async (r:Request,s:Response)=>sendSuccess(s,await service.selectWorker(r.auth!.userId,String(r.params.id),r.body),"Worker selected",201)
  ,updateBid:async(r:Request,s:Response)=>sendSuccess(s,await service.updateBid(r.auth!.userId,String(r.params.id),r.body),"Bid updated")
  ,withdrawBid:async(r:Request,s:Response)=>{await service.withdrawBid(r.auth!.userId,String(r.params.id));return sendNoContent(s)}
};
export const bookingController = {
  list: async (r:Request,s:Response)=>sendSuccess(s,await service.bookings(r.auth!.userId,r.auth!.roles,r.query as never)),
  create: async (r:Request,s:Response)=>sendSuccess(s,await service.directBooking(r.auth!.userId,r.body),"Booking created",201),
  detail: async (r:Request,s:Response)=>sendSuccess(s,await service.booking(r.auth!.userId,r.auth!.roles,String(r.params.id))),
  update:async(r:Request,s:Response)=>sendSuccess(s,await service.updateBooking(r.auth!.userId,r.auth!.roles,String(r.params.id),r.body),"Booking updated"),
  transition: async (r:Request,s:Response)=>sendSuccess(s,await service.transition(r.auth!.userId,r.auth!.roles,String(r.params.id),r.body),"Booking updated"),
  cancel: async (r:Request,s:Response)=>sendSuccess(s,await service.cancel(r.auth!.userId,r.auth!.roles,String(r.params.id),r.body),"Booking cancelled"),
  history: async (r:Request,s:Response)=>sendSuccess(s,(await service.booking(r.auth!.userId,r.auth!.roles,String(r.params.id))).history)
};
