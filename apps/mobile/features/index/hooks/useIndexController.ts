import { useAuthStore } from '@/store/useAuthStore';

export function useIndexController() {
  const { isAuthenticated, isLoading } = useAuthStore();
  return { isAuthenticated, isLoading };
}
