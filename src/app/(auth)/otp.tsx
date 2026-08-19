import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft } from 'lucide-react-native';
import {
  loadCurrentUser,
  resendEmailOtp,
  verifyEmailOtp,
} from '@/services/auth';
import { completePendingWorkerApplication } from '@/services/workerApplication';

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const router = useRouter();
  const { email, resumeToken } = useLocalSearchParams<{
    email: string;
    resumeToken?: string;
  }>();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const goBack = useGoBack('/(auth)/landing');

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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

      // Resume an in-flight worker registration whenever one is pending,
      // independent of the role returned above (the role can lag behind the
      // OTP confirmation, which used to strand workers on the customer
      // verification page).
      try {
        const completion = await completePendingWorkerApplication(resumeToken);
        if (completion.completed) {
          router.replace({
            pathname: '/register-worker',
            params: { submitted: 'true' },
          });
          return;
        }
      } catch (completeErr) {
        router.replace({
          pathname: '/register-worker',
          params: {
            error:
              completeErr instanceof Error
                ? completeErr.message
                : 'We could not finish submitting your registration. Please try again.',
          },
        });
        return;
      }

      if (user?.role === 'WORKER') {
        router.replace({
          pathname: '/register-worker',
          params: {
            notice:
              'Your registration was not completed. Please review your details and submit again.',
          },
        });
        return;
      }

      router.replace('/(auth)/verify-identity');
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

  const renderSlot = (index: number) => (
    <View key={index} style={styles.slotWrapper}>
      <RNTextInput
        ref={(ref) => {
          inputs.current[index] = ref;
        }}
        style={[
          styles.otpInput,
          focusedIndex === index && styles.otpInputFocused,
          error ? styles.otpInputError : null,
        ]}
        value={otp[index]}
        onChangeText={(val) => handleOtpChange(val, index)}
        onKeyPress={(e) => handleKeyPress(e, index)}
        onFocus={() => setFocusedIndex(index)}
        onBlur={() => setFocusedIndex(null)}
        keyboardType="number-pad"
        maxLength={1}
        selectTextOnFocus
        accessibilityLabel={`Digit ${index + 1}`}
      />
    </View>
  );

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[theme.typography.h1, styles.title]}>Verify Account</Text>
        <Text style={[theme.typography.body1, styles.subtitle]}>
          Enter the 6-digit code sent to {email || 'your email'}.
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((_, index) => renderSlot(index))}
        </View>

        {error ? (
          <Text style={[theme.typography.caption, styles.errorText]}>
            {error}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {countdown > 0 ? (
            <Text style={theme.typography.body2}>
              Resend code in{' '}
              <Text style={{ color: theme.colors.primary }}>{countdown}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text
                style={[
                  theme.typography.button,
                  { color: theme.colors.primary },
                ]}
              >
                Resend Code
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          fullWidth
          style={styles.submitBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: theme.spacing.md },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1, paddingTop: theme.spacing.xxl },
  title: { color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  slotWrapper: {
    width: 48,
    height: 56,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    padding: 0,
  },
  otpInputFocused: {
    borderColor: theme.colors.primary,
  },
  otpInputError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBackground,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.md,
  },
  submitBtn: { marginTop: theme.spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
});
