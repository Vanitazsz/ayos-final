import { useQuery } from '@tanstack/react-query';
import { fetchCustomerProfile, fetchWorkerProfile } from '@/services/api';
import {
  queryKeys,
  QUERY_STALE_TIMES,
  toQueryData,
} from '@/services/queryUtils';
import { useAuthStore } from '@/store/useAuthStore';

export function useCustomerProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: queryKeys.customerProfile(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchCustomerProfile()),
    staleTime: QUERY_STALE_TIMES.profile,
    enabled: Boolean(userId),
  });
}

export function useWorkerProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: queryKeys.workerProfile(userId ?? 'anonymous'),
    queryFn: async () => toQueryData(await fetchWorkerProfile()),
    staleTime: QUERY_STALE_TIMES.profile,
    enabled: Boolean(userId),
  });
}
