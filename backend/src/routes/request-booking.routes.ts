import { Router } from "express";
import { bookingController, requestController } from "../controllers/request-booking.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { bidSchema, bidUpdateSchema, bookingCreateSchema, bookingListSchema, bookingUpdateSchema, cancelSchema, matchSchema, publishSchema, requestCreateSchema, requestListSchema, requestParamsSchema, requestUpdateSchema, selectWorkerSchema, transitionSchema } from "../validators/request.schemas.js";

export const requestRouter=Router(); requestRouter.use(authenticate);
requestRouter.get("/",validate({query:requestListSchema}),requestController.list);
requestRouter.post("/",requireRole("customer"),validate({body:requestCreateSchema}),requestController.create);
requestRouter.get("/:id",validate({params:requestParamsSchema}),requestController.detail);
requestRouter.patch("/:id",requireRole("customer"),validate({params:requestParamsSchema,body:requestUpdateSchema}),requestController.update);
requestRouter.delete("/:id",requireRole("customer"),validate({params:requestParamsSchema}),requestController.remove);
requestRouter.post("/:id/analyze",requireRole("customer"),validate({params:requestParamsSchema}),requestController.analyze);
requestRouter.post("/:id/publish",requireRole("customer"),validate({params:requestParamsSchema,body:publishSchema}),requestController.publish);
requestRouter.get("/:id/matches",requireRole("customer"),validate({params:requestParamsSchema}),requestController.matches);
requestRouter.post("/:id/matches",requireRole("customer","admin"),validate({params:requestParamsSchema,body:matchSchema}),requestController.generateMatches);
requestRouter.get("/:id/bids",requireRole("customer"),validate({params:requestParamsSchema}),requestController.bids);
requestRouter.post("/:id/bids",requireRole("worker"),validate({params:requestParamsSchema,body:bidSchema}),requestController.bid);
requestRouter.post("/:id/select-worker",requireRole("customer"),validate({params:requestParamsSchema,body:selectWorkerSchema}),requestController.select);

export const bookingRouter=Router(); bookingRouter.use(authenticate);
bookingRouter.get("/",validate({query:bookingListSchema}),bookingController.list);
bookingRouter.post("/",requireRole("customer"),validate({body:bookingCreateSchema}),bookingController.create);
bookingRouter.get("/:id",validate({params:requestParamsSchema}),bookingController.detail);
bookingRouter.patch("/:id",validate({params:requestParamsSchema,body:bookingUpdateSchema}),bookingController.update);
bookingRouter.post("/:id/transitions",validate({params:requestParamsSchema,body:transitionSchema}),bookingController.transition);
bookingRouter.post("/:id/cancel",validate({params:requestParamsSchema,body:cancelSchema}),bookingController.cancel);
bookingRouter.get("/:id/history",validate({params:requestParamsSchema}),bookingController.history);

export const bidRouter=Router();bidRouter.use(authenticate,requireRole("worker"));bidRouter.patch("/:id",validate({params:requestParamsSchema,body:bidUpdateSchema}),requestController.updateBid);bidRouter.delete("/:id",validate({params:requestParamsSchema}),requestController.withdrawBid);
