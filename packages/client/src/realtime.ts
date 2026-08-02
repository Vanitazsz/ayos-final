import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

export function subscribeToMessages(
  client: SupabaseClient<Database>,
  conversationId: string,
  onChange: () => void
) {
  return client
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      onChange
    )
    .subscribe();
}

export function subscribeToUserNotifications(
  client: SupabaseClient<Database>,
  userId: string,
  onChange: () => void
) {
  return client
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      onChange
    )
    .subscribe();
}

export function subscribeToBooking(
  client: SupabaseClient<Database>,
  bookingId: string,
  onChange: () => void
) {
  return client
    .channel(`booking:${bookingId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
      onChange
    )
    .subscribe();
}
