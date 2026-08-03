import { styles } from './AuthOtpScreen.styles';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import type { useAuthOtpScreenController } from '../hooks/useAuthOtpScreenController';

export function OTPView({
  model,
}: {
  model: ReturnType<typeof useAuthOtpScreenController>;
}) {
  const {
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
  } = model;
  return (
    <Screen safeArea scrollable>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
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
          {otp.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                theme.typography.h3,
                digit !== '' && styles.otpInputFilled,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? (
          <Text style={[theme.typography.caption, styles.errorText]}>
            {error}
          </Text>
        ) : null}

        <Button
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          fullWidth
          style={styles.submitBtn}
        />

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
      </View>
    </Screen>
  );
}
