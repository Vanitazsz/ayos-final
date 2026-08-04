export {
  cancelBooking,
  fetchBookingDetail,
  fetchCancellationReasons,
} from '@/services/bookings';

export type CancellationReason = {
  id: string;
  label: string;
  category: string;
  jobStages: string[];
  requiresInput: boolean;
};

export const categoryLabels: Record<string, string> = {
  customer: 'Customer-related',
  worker: 'Worker-related',
  job: 'Job-related',
  policy: 'Policy & Safety',
  other: 'Other',
};

export const categoryOrder = ['customer', 'worker', 'job', 'policy', 'other'];

export const filterRecommendations = (
  reasons: CancellationReason[],
  customReason: string,
  selectedReasonId: string | null | undefined,
): CancellationReason[] => {
  if (!customReason || customReason.length < 2) return [];
  const lower = customReason.toLowerCase();
  return reasons
    .filter(
      (r) =>
        r.label.toLowerCase().includes(lower) && r.id !== selectedReasonId,
    )
    .slice(0, 5);
};
