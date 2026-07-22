import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import type { SupabaseEnvironment } from "./env.js";

export type ApiSuccess<T> = { success: true; message: string; data: T };
export type ApiFailure = {
  success: false;
  code: string;
  message: string;
  errors?: Record<string, string[]>;
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
export type PageMeta = { page: number; limit: number; total: number; totalPages: number };
export type Page<T> = { items: T[]; meta: PageMeta };

export class AyosApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AyosApiError";
  }
}

export function createAyosApi(
  client: SupabaseClient<Database>,
  environment: SupabaseEnvironment,
  fetcher: typeof fetch = fetch
) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { data } = await client.auth.getSession();
    if (!data.session) throw new AyosApiError(401, "authentication_required", "Authentication required");

    const response = await fetcher(
      `${environment.url}/functions/v1/api${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...init,
        headers: {
          apikey: environment.publishableKey,
          Authorization: `Bearer ${data.session.access_token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers
        }
      }
    );
    const result = (await response.json()) as ApiResult<T>;
    if (!response.ok || !result.success) {
      const failure = result as ApiFailure;
      throw new AyosApiError(
        response.status,
        failure.code ?? "request_failed",
        failure.message,
        failure.errors
      );
    }
    return result.data;
  }

  return {
    request,
    get<T>(path: string) {
      return request<T>(path);
    },
    post<T>(path: string, body: unknown) {
      return request<T>(path, { method: "POST", body: JSON.stringify(body) });
    },
    patch<T>(path: string, body: unknown) {
      return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
    },
    delete<T>(path: string) {
      return request<T>(path, { method: "DELETE" });
    }
  };
}
