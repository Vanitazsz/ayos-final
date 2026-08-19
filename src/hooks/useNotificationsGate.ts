import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { showAlert } from '@/components/AppAlert';
import { useAuthStore } from '@/store/useAuthStore';

export function useNotificationsGate() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return useCallback(() => {
    if (user && !user.profileComplete) {
      showAlert(
        'Verification In Progress',
        'Your account is still being verified. Please wait until verification is complete.',
      );
      return;
    }
    router.push('/notifications');
  }, [user, router]);
}
