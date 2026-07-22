export type SupabaseEnvironment = {
  url: string;
  publishableKey: string;
};

export function readExpoSupabaseEnvironment(): SupabaseEnvironment {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Missing Expo Supabase environment variables");
  return { url, publishableKey };
}
