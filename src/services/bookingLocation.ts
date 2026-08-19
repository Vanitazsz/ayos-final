import { supabase } from '@/lib/supabase';

export async function recordWorkerLocation(
  bookingId: string,
  latitude: number,
  longitude: number,
) {
  const { data, error } = await supabase.rpc('record_worker_location', {
    booking_id: bookingId,
    latitude,
    longitude,
  });
  if (error) throw error;
  return data;
}
