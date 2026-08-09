import { supabase } from '@/lib/supabase';

export interface ReviewLookup {
  id: string;
}

export async function fetchReviewForBooking(
  bookingId: string,
): Promise<ReviewLookup | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { id: data.id } : null;
}
