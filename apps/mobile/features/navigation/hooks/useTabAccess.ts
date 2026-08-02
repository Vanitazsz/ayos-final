import { useAuthStore } from '@/store/useAuthStore';

export type TabAccess = 'loading' | 'login' | 'customer' | 'worker';

export function useTabAccess(): TabAccess {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return 'loading';
  if (!isAuthenticated) return 'login';
  return user?.role === 'WORKER' ? 'worker' : 'customer';
}
