const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173,http://localhost:8081")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

let responseOrigin = configuredOrigins[0] ?? "http://localhost:5173";

export function corsHeadersFor(request: Request) {
  const origin = request.headers.get("origin");
  responseOrigin = origin && configuredOrigins.includes(origin) ? origin : configuredOrigins[0] ?? "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": responseOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  Vary: "Origin"
};

export function success(data: unknown, message = "Request completed", status = 200) {
  return Response.json({ success: true, message, data }, { status, headers: corsHeaders });
}

export function failure(status: number, code: string, message: string, errors?: Record<string, string[]>) {
  return Response.json({ success: false, code, message, ...(errors ? { errors } : {}) }, { status, headers: corsHeaders });
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new HttpError(415, "unsupported_media_type", "JSON required");
  const body = await request.json();
  if (!body || Array.isArray(body) || typeof body !== "object") throw new HttpError(400, "invalid_json", "JSON object required");
  return body as Record<string, unknown>;
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return failure(error.status, error.code, error.message);
  const message = error instanceof Error ? error.message : "Internal error";
  if (message === "authentication_required") return failure(401, "authentication_required", "Authentication required");
  if (message === "forbidden") return failure(403, "forbidden", "Permission denied");
  console.error(error);
  return failure(500, "internal_error", "The request could not be completed");
}
