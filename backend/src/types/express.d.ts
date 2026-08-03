import type { AuthContext } from "./security.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: AuthContext;
    }
  }
}

export {};
