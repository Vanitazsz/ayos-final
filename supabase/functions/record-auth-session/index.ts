import { corsHeadersFor, failure, handleError, success } from "../_shared/http.ts";
import { requestContext } from "../_shared/supabase.ts";

function jwtSessionId(authorization: string): string | null {
  const token = authorization.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(normalized)) as Record<string, unknown>;
    return typeof decoded.session_id === "string" ? decoded.session_id : null;
  } catch {
    return null;
  }
}

async function sha256(value: string | null): Promise<string | null> {
  if (!value) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  Object.assign((await import("../_shared/http.ts")).corsHeaders, corsHeadersFor(request));
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(request) });
  try {
    if (request.method !== "POST") return failure(405, "method_not_allowed", "POST required");
    const { admin, user } = await requestContext(request);
    const authorization = request.headers.get("authorization") ?? "";
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipAddress = forwarded || request.headers.get("cf-connecting-ip") || null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 1000) || null;
    const sessionIdHash = await sha256(jwtSessionId(authorization));

    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    let existingQuery = admin
      .from("authentication_events")
      .select("*")
      .eq("account_id", user.id)
      .eq("event_type", "SIGNED_IN")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (sessionIdHash) existingQuery = existingQuery.eq("session_id_hash", sessionIdHash);
    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) throw existingError;
    if (existing) return success(existing, "Authentication session already recorded");

    const { data, error } = await admin.from("authentication_events").insert({
      account_id: user.id,
      event_type: "SIGNED_IN",
      session_id_hash: sessionIdHash,
      ip_address: ipAddress,
      user_agent: userAgent
    }).select().single();
    if (error) throw error;
    return success(data, "Authentication session recorded", 201);
  } catch (error) {
    return handleError(error);
  }
});
