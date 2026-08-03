import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function useNewRequestSuccessScreenController() {
  const router = useRouter();
  const requestId = useRequestStore((state) => state.requestId);
  const resetDraft = useRequestStore((state) => state.reset);
  const handleViewRequest = () => {
    if (requestId) router.replace(`/request/${requestId}` as any);
  };
  const handleBackToHome = () => {
    resetDraft();
    router.replace('/(tabs)/home' as any);
  };
  return { handleViewRequest, handleBackToHome };
}
