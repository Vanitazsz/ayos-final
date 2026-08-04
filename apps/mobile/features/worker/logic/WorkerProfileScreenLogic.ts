export const workerProfileStatusMeta: Record<
  string,
  { label: string; variant: 'success' | 'error' | 'warning' | 'info' }
> = {
  verified: { label: 'Verified Worker', variant: 'success' },
  rejected: { label: 'Verification Rejected', variant: 'error' },
  needs_review: { label: 'Needs Document Review', variant: 'warning' },
  pending: { label: 'Verification Pending', variant: 'info' },
};

export const normalizePhilippinePhone = (mobile: string): string =>
  mobile.startsWith('0') ? `+63${mobile.slice(1)}` : mobile;

export { fetchWorkerProfile } from '@/services/workerOperations';
export { formatRating } from '@/services/reviewRatings';
export { signOut } from '@/services/auth';
export { selectImage } from '@/services/deviceImages';
export {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '@/services/profile';
export {
  fetchActiveSubdivisions,
  setMySubdivision,
  type Subdivision,
} from '@/services/subdivisions';
