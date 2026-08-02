import {
  loadCurrentUser,
  resendEmailOtp,
  verifyEmailOtp,
} from '../logic/AuthOtpScreenLogic';
import { useState, useEffect, useRef } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
const OTP_LENGTH = 6;
export function useAuthOtpScreenController() {
  const router = useRouter();
  const { email, returnTo } = useLocalSearchParams<{
    email: string;
    returnTo?: string;
  }>();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<(RNTextInput | null)[]>([]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto focus next
    if (value !== '' && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputs.current[index - 1]?.focus();
    }
  };
  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < OTP_LENGTH) {
      setError('Please enter all digits');
      return;
    }

    setLoading(true);
    try {
      await verifyEmailOtp(email ?? '', otpValue);
      const user = await loadCurrentUser();
      setSessionUser(user);
      if (returnTo === 'worker-registration' && user?.role === 'WORKER') {
        if (router.canGoBack()) router.back();
        else router.replace('/register-worker');
        return;
      }
      router.replace(
        user?.role === 'WORKER'
          ? '/register-worker'
          : '/(auth)/verify-identity',
      );
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'Invalid verification code',
      );
    } finally {
      setLoading(false);
    }
  };
  const handleResend = async () => {
    try {
      await resendEmailOtp(email ?? '');
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : 'Unable to resend code',
      );
      return;
    }
    setCountdown(30);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputs.current[0]?.focus();
  };
  return {
    router,
    email,
    otp,
    loading,
    error,
    countdown,
    inputs,
    handleOtpChange,
    handleKeyPress,
    handleVerify,
    handleResend,
  };
}
