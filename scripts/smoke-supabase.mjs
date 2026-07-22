import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" }));
const url = process.env.SUPABASE_URL ?? status.API_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? status.PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? status.SECRET_KEY;
const email = `smoke-${Date.now()}@a-yos.local`;
const password = "Smoke-Test-1234";
const mobile = `+639${String(Date.now()).slice(-9)}`;
const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId;
let termsCreated = false;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const existingTerms = await admin.from("content_pages").select("id").eq("key", "TERMS").maybeSingle();
  if (existingTerms.error) throw existingTerms.error;
  if (!existingTerms.data) {
    const terms = await admin.from("content_pages").insert({
      key: "TERMS",
      title: "Local integration test terms",
      body: "Local-only terms fixture used to exercise the registration and request workflow.",
      version: "local-smoke",
      published_at: new Date().toISOString()
    });
    if (terms.error) throw terms.error;
    termsCreated = true;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Smoke Test", role: "USER" }
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${signedIn.data.session.access_token}`,
    "Content-Type": "application/json"
  };

  const categoriesResponse = await fetch(`${url}/functions/v1/api/categories`, { headers });
  const categories = await categoriesResponse.json();
  assert(categoriesResponse.status === 200 && categories.success, "Catalog Edge API failed");
  assert(categories.data.items.length > 0, "Catalog seed data is missing");

  const initialProfile = await client.rpc("get_my_profile");
  if (initialProfile.error) throw initialProfile.error;
  assert(initialProfile.data?.profile, `Current profile RPC returned no role profile: ${JSON.stringify(initialProfile.data)}`);
  assert(initialProfile.data.profile.display_name === "Smoke Test", "Profile provisioning did not preserve the submitted name");
  assert(initialProfile.data.profile_complete === true, "New profile was not marked complete");
  const updatedProfile = await client.rpc("update_my_profile", {
    p_display_name: "Smoke Test Updated",
    p_mobile: mobile,
    p_location: null,
    p_bio: null,
    p_given_name: null,
    p_family_name: null
  });
  if (updatedProfile.error) throw updatedProfile.error;
  assert(updatedProfile.data.profile.display_name === "Smoke Test Updated", "Profile update RPC did not persist the name");

  const avatarPath = `${userId}/smoke-avatar.png`;
  const avatarUpload = await client.storage.from("profile-avatars").upload(
    avatarPath,
    new Blob(["avatar"], { type: "image/png" }),
    { contentType: "image/png" }
  );
  if (avatarUpload.error) throw avatarUpload.error;
  const avatarProfile = await client.rpc("set_my_avatar", { p_storage_path: avatarPath });
  if (avatarProfile.error) throw avatarProfile.error;
  assert(avatarProfile.data.profile.avatar_path === avatarPath, "Avatar path was not persisted");

  const workerRole = await client.rpc("enable_secondary_role", { p_role: "WORKER" });
  if (workerRole.error) throw workerRole.error;
  const createdWorker = await client.from("worker_profiles").select("display_name").eq("account_id", userId).single();
  if (createdWorker.error) throw createdWorker.error;
  assert(createdWorker.data.display_name === "Smoke Test Updated", "Role switching generated a placeholder profile name");

  const categoryId = categories.data.items[0].id;
  const addressResult = await client.rpc("save_geocoded_address", {
    p_label: "Smoke service location",
    p_line1: "Manila",
    p_line2: null,
    p_barangay: "Ermita",
    p_city: "Manila",
    p_province: "Metro Manila",
    p_postal_code: "1000",
    p_latitude: 14.5995,
    p_longitude: 120.9842,
    p_provider_id: "smoke-local",
    p_confidence: 1,
    p_payload: { source: "integration-test" },
    p_is_default: false
  });
  if (addressResult.error) throw addressResult.error;
  const requestResponse = await fetch(`${url}/functions/v1/api/requests`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      categoryId,
      addressId: addressResult.data.id,
      description: "Automated local Supabase integration request.",
      scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
      budget: 500,
      notifyOnMatch: true
    })
  });
  const serviceRequest = await requestResponse.json();
  assert(
    requestResponse.status === 201 && serviceRequest.success,
    `Request API failed: ${serviceRequest.message}`
  );

  const unauthorized = createClient(url, publishableKey, { auth: { persistSession: false } });
  const hidden = await unauthorized
    .from("service_requests")
    .select("id")
    .eq("id", serviceRequest.data.id)
    .maybeSingle();
  assert(
    hidden.data === null || hidden.data === undefined,
    "RLS exposed a private service request to an anonymous client"
  );
  assert(
    !hidden.error || hidden.error.code === "42501",
    `Unexpected anonymous query error: ${hidden.error?.message}`
  );
  const hiddenAvatar = await unauthorized.storage.from("profile-avatars").download(avatarPath);
  assert(Boolean(hiddenAvatar.error), "Anonymous client downloaded a private profile avatar");

  const uploaded = await client.storage
    .from("service-request-media")
    .upload(`${userId}/smoke.png`, new Blob(["smoke"], { type: "image/png" }), { contentType: "image/png" });
  if (uploaded.error) throw uploaded.error;

  console.log(
    JSON.stringify({
      success: true,
      checks: ["auth", "profile-rpc", "role-profile-integrity", "edge-api", "database-rls", "storage-rls"],
      requestId: serviceRequest.data.id
    })
  );
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
  if (termsCreated) await admin.from("content_pages").delete().eq("version", "local-smoke");
}
