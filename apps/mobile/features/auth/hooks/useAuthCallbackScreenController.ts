import {
  loadOAuthCallbackUser,
  signInWithGoogle,
} from '../logic/AuthCallbackScreenLogic';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
type CallbackState =
  | { status: 'loading' }
  | { status: 'error'; message: string };

function parameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
export function useAuthCallbackScreenController() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const [state, setState] = useState<CallbackState>({ status: 'loading' });
  const [retrying, setRetrying] = useState(false);
  const callbackCode = useMemo(() => parameter(params.code), [params.code]);
  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      try {
        const providerError =
          parameter(params.error_description) || parameter(params.error);
        if (providerError) throw new Error(providerError);

        const user = await loadOAuthCallbackUser(callbackCode);
        if (cancelled) return;
        setSessionUser(user);
        router.replace(
          user.profileComplete
            ? user.role === 'WORKER'
              ? '/(worker)'
              : '/(tabs)/home'
            : user.role === 'WORKER'
              ? '/(worker)/profile'
              : '/(tabs)/profile',
        );
      } catch (error) {
        if (!cancelled)
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Google sign-in could not be completed.',
          });
      }
    };
    void finish();
    return () => {
      cancelled = true;
    };
  }, [
    callbackCode,
    params.error,
    params.error_description,
    router,
    setSessionUser,
  ]);
  const retry = async () => {
    setRetrying(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Google sign-in could not be completed.',
      });
      setRetrying(false);
    }
  };
  return { router, state, retrying, retry };
}
