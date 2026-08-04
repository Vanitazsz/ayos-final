import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function useNewRequestSuccessScreenController() {
  const router = useRouter();
  const resetDraft = useRequestStore((state) => state.reset);
  const handleBackToHome = () => {
    resetDraft();
    router.replace('/(tabs)/home' as any);
  };
  return { handleBackToHome };
}
