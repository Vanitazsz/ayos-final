import {
  loadCurrentUser,
  requestPasswordReset,
  signInWithGoogle,
  signInWithPassword,
} from '../logic/AuthLoginScreenLogic';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '@/store/useAuthStore';
import { Image } from 'expo-image';

export function useAuthLoginScreenController() {
  const router = useRouter();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const sessionNotice = useAuthStore((state) => state.sessionNotice);
  const clearSessionNotice = useAuthStore((state) => state.clearSessionNotice);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = async (data: any) => {
    clearSessionNotice();
    setErrorMessage('');
    setLoading(true);
    try {
      const user = await signInWithPassword(data.email, data.password);
      setSessionUser(user);
      router.replace(user?.role === 'WORKER' ? '/(worker)' : '/(tabs)/home');
    } catch (error) {
      console.error('[login] signIn error:', error);
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : ((error as any)?.message ??
              (error as any)?.error_description ??
              'Unable to sign in. Please try again.');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };
  const onGoogle = async () => {
    clearSessionNotice();
    setErrorMessage('');
    setLoading(true);
    try {
      await signInWithGoogle();
      const user = await loadCurrentUser();
      setSessionUser(user);
      router.replace(user?.role === 'WORKER' ? '/(worker)' : '/(tabs)/home');
    } catch (error) {
      console.error('[login] google signIn error:', error);
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : ((error as any)?.message ?? 'Unable to sign in with Google.');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };
  const onForgotPassword = async () => {
    const email = getValues('email');
    if (!email) {
      Alert.alert('Email required', 'Enter your email address first.');
      return;
    }
    try {
      await requestPasswordReset(email);
      Alert.alert(
        'Check your email',
        'A secure password reset link has been sent.',
      );
    } catch (error) {
      Alert.alert(
        'Reset failed',
        error instanceof Error ? error.message : 'Unable to send reset email',
      );
    }
  };
  return {
    router,
    sessionNotice,
    loading,
    showPassword,
    setShowPassword,
    errorMessage,
    setErrorMessage,
    control,
    handleSubmit,
    errors,
    onSubmit,
    onGoogle,
    onForgotPassword,
    Controller,
    Image,
  };
}
