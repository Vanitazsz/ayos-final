import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function usePaymentReceivedScreenController() {
  const router = useRouter();
  const resetRequest = useRequestStore((state) => state.reset);
  const handleGoHome = () => {
    resetRequest();
    router.replace('/(tabs)/home');
  };
  return { handleGoHome };
}
