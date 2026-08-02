import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";
import { readExpoSupabaseEnvironment } from "./env.js";

export function createMobileSupabaseClient(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}) {
  const { url, publishableKey } = readExpoSupabaseEnvironment();
  return createClient<Database>(url, publishableKey, {
    auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
}
