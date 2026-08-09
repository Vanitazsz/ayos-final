const PROOF_VISIBLE_STATUSES = new Set([
  'PENDING_CONFIRMATION',
  'COMPLETED',
]);

export function shouldLoadBookingProofPhotos(status: string | undefined): boolean {
  return status != null && PROOF_VISIBLE_STATUSES.has(status);
}
