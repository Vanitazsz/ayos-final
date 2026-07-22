import type { Request, Response } from "express";
import { userService } from "../services/user.service.js";
import { sendNoContent, sendSuccess } from "../utils/response.js";

export const userController = {
  me: async (request: Request, response: Response) => sendSuccess(response, await userService.me(request.auth!.userId)),
  updateProfile: async (request: Request, response: Response) => sendSuccess(response, await userService.updateProfile(request.auth!.userId, request.body), "Profile updated"),
  deleteAccount: async (request: Request, response: Response) => {
    await userService.deleteAccount(request.auth!.userId, request.body.password);
    return sendSuccess(response, {}, "Account deleted");
  },
  addresses: async (request: Request, response: Response) => sendSuccess(response, await userService.listAddresses(request.auth!.userId, Number(request.query.page), Number(request.query.limit))),
  createAddress: async (request: Request, response: Response) => sendSuccess(response, await userService.createAddress(request.auth!.userId, request.body), "Address created", 201),
  updateAddress: async (request: Request, response: Response) => sendSuccess(response, await userService.updateAddress(request.auth!.userId, String(request.params.id), request.body), "Address updated"),
  deleteAddress: async (request: Request, response: Response) => {
    await userService.deleteAddress(request.auth!.userId, String(request.params.id));
    return sendNoContent(response);
  },
  setLocation: async (request: Request, response: Response) => sendSuccess(response, await userService.setLocation(request.auth!.userId, request.body), "Location saved"),
  consent: async (request: Request, response: Response) => sendSuccess(response, await userService.recordConsent(request.auth!.userId, request.body, request.ip), "Consent recorded", 201),
  settings: async (request: Request, response: Response) => sendSuccess(response, await userService.settings(request.auth!.userId)),
  updateSettings: async (request: Request, response: Response) => sendSuccess(response, await userService.updateSettings(request.auth!.userId, request.body), "Settings updated"),
  favorites: async (request: Request, response: Response) => sendSuccess(response, await userService.listFavorites(request.auth!.userId)),
  addFavorite: async (request: Request, response: Response) => sendSuccess(response, await userService.addFavorite(request.auth!.userId, String(request.params.providerId)), "Favorite added", 201),
  removeFavorite: async (request: Request, response: Response) => {
    await userService.removeFavorite(request.auth!.userId, String(request.params.providerId));
    return sendNoContent(response);
  },
  identity:async(request:Request,response:Response)=>sendSuccess(response,await userService.addIdentityDocument(request.auth!.userId,request.body),"Identity document submitted",201)
};
