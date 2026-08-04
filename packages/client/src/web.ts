import { createBrowserClient, createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "@ayos/supabase";

export function createWebSupabaseClient(url: string, publishableKey: string) {
  return createBrowserClient<Database>(url, publishableKey);
}

export function createSsrSupabaseClient(url: string, publishableKey: string, cookies: CookieMethodsServer) {
  return createServerClient<Database>(url, publishableKey, { cookies });
}
