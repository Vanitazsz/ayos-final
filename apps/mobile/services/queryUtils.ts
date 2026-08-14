import type { ApiResponse } from '@/services/api';

export const QUERY_STALE_TIMES = {
  catalog: 5 * 60 * 1000,
  profile: 5 * 60 * 1000,
  list: 30 * 1000,
  live: 0,
} as const;

export function toQueryData<T>(response: ApiResponse<T>): T {
  if (response.error) throw new Error(response.error);
  return response.data;
}

export const queryKeys = {
  catalogCategories: ['catalog', 'categories'] as const,
  catalogProviders: ['catalog', 'providers'] as const,
  customerProfile: (userId: string) => ['customer', 'profile', userId] as const,
  customerBookings: (userId: string) =>
    ['customer', 'bookings', userId] as const,
  workerProfile: (userId: string) => ['worker', 'profile', userId] as const,
  workerBookings: (userId: string) => ['worker', 'bookings', userId] as const,
  workerSkills: (userId: string) => ['worker', 'skills', userId] as const,
  wallet: (userId: string) => ['wallet', userId] as const,
  walletTransactions: (userId: string) =>
    ['wallet', 'transactions', userId] as const,
  walletTopups: (userId: string) => ['wallet', 'topups', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  bookingTracking: (bookingId: string) =>
    ['booking', 'tracking', bookingId] as const,
  bookingProofPhotos: (bookingId: string) =>
    ['booking', 'proofPhotos', bookingId] as const,
} as const;
