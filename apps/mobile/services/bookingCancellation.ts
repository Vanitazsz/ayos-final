import { supabase } from '@/lib/supabase';

export type CancellationStage =
  | 'BEFORE_ACCEPTANCE'
  | 'BEFORE_TRAVEL'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'SERVICE_STARTED'
  | 'IN_PROGRESS';

const STAGE_BY_STATUS: Record<string, CancellationStage> = {
  PENDING: 'BEFORE_ACCEPTANCE',
  ACCEPTED: 'BEFORE_TRAVEL',
  WORKER_PREPARING: 'BEFORE_TRAVEL',
  WORKER_EN_ROUTE: 'EN_ROUTE',
  WORKER_ARRIVED: 'ARRIVED',
  SERVICE_STARTED: 'SERVICE_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
};

export function cancellationStageForStatus(status: string): CancellationStage {
  return STAGE_BY_STATUS[status.toUpperCase()] ?? 'BEFORE_ACCEPTANCE';
}

async function submitCancellation(
  bookingId: string,
  reasonCode: string,
  details: string,
  policyVersion: string,
) {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .single();
  if (bookingError) throw bookingError;

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_expected_version: null,
    p_stage: cancellationStageForStatus(booking.status),
    p_reason_code: reasonCode,
    p_details: details,
    p_policy_version: policyVersion,
  });
  if (error) throw error;
  return { data };
}

export function cancelCustomerBooking(
  bookingId: string,
  reasonCode: string,
  details: string,
  policyVersion: string,
) {
  return submitCancellation(bookingId, reasonCode, details, policyVersion);
}

export function cancelWorkerBooking(bookingId: string, reason: string) {
  return submitCancellation(
    bookingId,
    'DECLINED',
    reason || 'Worker declined assigned booking',
    '2026-07-21',
  );
}
