import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export type UploadBucket =
  "avatars" | "request-media" | "verification" | "messages" | "reviews" | "reports" | "support";

export async function uploadOwnedFile(
  client: SupabaseClient<Database>,
  bucket: UploadBucket,
  userId: string,
  filename: string,
  body: ArrayBuffer | Blob,
  contentType: string
) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const result = await client.storage.from(bucket).upload(path, body, { contentType, upsert: false });
  if (result.error) throw result.error;
  return result.data;
}
