import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { LegalContentModal } from '@/components/LegalContentModal';
import {
  InfoCard,
  InfoCardHighlight,
  infoCardStyles,
} from '@/components/InfoCard';
import { theme } from '@/constants/theme';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { signUpCustomer } from '@/services/auth';
import { isValidPhilippinePhone } from '@/lib/workerRegistration';
import { showAlert } from '@/components/AppAlert';
import { PasswordRequirements } from '@/components/PasswordRequirements';

export default function CreateAccountScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(auth)/register');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [formError, setFormError] = useState('');
  const [legalModal, setLegalModal] = useState<'TERMS' | 'PRIVACY' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data: any) => {
    if (!acceptedTerms) {
      setTermsError('You must accept the Terms and Conditions and Privacy Policy to proceed.');
      return;
    }
    setTermsError('');
    setFormError('');

    setLoading(true);
    try {
      await signUpCustomer(data);
      router.push({ pathname: '/(auth)/otp', params: { email: data.email } });
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Registration failed. Check your details and try again.';
      setFormError(msg);
      showAlert('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      style={{ paddingBottom: 0 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 80,
      }}
    >
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </Pressable>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[theme.typography.h2, styles.headerTitle]}
        >
          Create account
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={[theme.typography.body1, styles.subtitle]}>
          Sign up to hire top-rated service professionals.
        </Text>

        {formError ? (
          <View
            style={[infoCardStyles.card, styles.errorCard]}
            accessibilityRole="alert"
          >
            <View style={[styles.iconBadge, styles.errorBadge]}>
              <AlertCircle size={16} color={theme.colors.error} />
            </View>
            <View style={infoCardStyles.body}>
              <Text style={[infoCardStyles.title, styles.errorText]}>
                Registration issue
              </Text>
              <Text style={[infoCardStyles.bodyText, styles.errorText]}>
                {formError}
              </Text>
            </View>
          </View>
        ) : null}

        <InfoCard title="Before you start">
          Fill out all required fields below. Any missing or invalid entry will
          be <InfoCardHighlight>highlighted in red</InfoCardHighlight>. Accept
          the Terms &amp; Conditions before submitting.
        </InfoCard>

        <View style={styles.form}>
          <Controller
            control={control}
            rules={{ required: 'Full name is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Full name"
                placeholder="Full name"
                leftIcon={<User color={theme.colors.textSecondary} size={20} />}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
            name="name"
          />

          <Controller
            control={control}
            rules={{
              required: 'Mobile number is required',
              validate: (value) =>
                isValidPhilippinePhone(value) ||
                'Enter a valid PH mobile number, e.g. 09171234567 or +639171234567.',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Mobile number"
                placeholder="09171234567 or +639171234567"
                helperText="Example: 09171234567 or +639171234567 (11 digits starting with 09)"
                leftIcon={<Phone color={theme.colors.textSecondary} size={20} />}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.mobile?.message}
              />
            )}
            name="mobile"
          />

          <Controller
            control={control}
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email address format',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email"
                placeholder="you@example.com"
                leftIcon={<Mail color={theme.colors.textSecondary} size={20} />}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
            name="email"
          />

          <Controller
            control={control}
            rules={{
              required: 'Password is required',
              validate: (value) =>
                /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value) ||
                'Use 8+ characters with uppercase, number, and symbol',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Password"
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                leftIcon={<Lock color={theme.colors.textSecondary} size={20} />}
                rightIcon={
                  showPassword ? (
                    <EyeOff color={theme.colors.textSecondary} size={20} />
                  ) : (
                    <Eye color={theme.colors.textSecondary} size={20} />
                  )
                }
                onRightIconPress={() => setShowPassword((visible) => !visible)}
                rightIconAccessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
            name="password"
          />

          <Controller
            control={control}
            rules={{
              required: 'Confirm password is required',
              validate: (val) =>
                val === password || 'Passwords do not match',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Confirm password"
                placeholder="Re-enter your password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                leftIcon={<Lock color={theme.colors.textSecondary} size={20} />}
                rightIcon={
                  showConfirmPassword ? (
                    <EyeOff color={theme.colors.textSecondary} size={20} />
                  ) : (
                    <Eye color={theme.colors.textSecondary} size={20} />
                  )
                }
                onRightIconPress={() =>
                  setShowConfirmPassword((visible) => !visible)
                }
                rightIconAccessibilityLabel={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
            name="confirmPassword"
          />

          <PasswordRequirements
            password={password}
            confirmation={confirmPassword}
            showMatch
          />

          <View style={styles.termsRow}>
            <Pressable
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                if (!acceptedTerms) setTermsError('');
              }}
              hitSlop={8}
              style={styles.checkboxTouchable}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              aria-checked={acceptedTerms}
              accessibilityLabel="Accept terms and conditions"
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                  !!termsError && styles.checkboxError,
                ]}
              >
                {acceptedTerms && (
                  <Check color="#ffffff" size={14} strokeWidth={3} />
                )}
              </View>
            </Pressable>
            <Text style={[theme.typography.body2, styles.termsText]}>
              <Text
                onPress={() => {
                  setAcceptedTerms(!acceptedTerms);
                  if (!acceptedTerms) setTermsError('');
                }}
              >
                I agree to the{' '}
              </Text>
              <Text
                style={styles.termsLink}
                onPress={() => setLegalModal('TERMS')}
              >
                Terms and Conditions
              </Text>
              <Text
                onPress={() => {
                  setAcceptedTerms(!acceptedTerms);
                  if (!acceptedTerms) setTermsError('');
                }}
              >
                {' '}and{' '}
              </Text>
              <Text
                style={styles.termsLink}
                onPress={() => setLegalModal('PRIVACY')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
          {!!termsError && (
            <Text style={styles.termsErrorText}>{termsError}</Text>
          )}
        </View>

        <AppButton
          label="Send email code"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          style={styles.submitBtn}
        />
      </View>

      <View style={styles.footer}>
        <Text style={theme.typography.body2}>Already have an account? </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Log In"
        >
          <Text
            style={[theme.typography.button, { color: theme.colors.primary }]}
          >
            Log In
          </Text>
        </TouchableOpacity>
      </View>

      <LegalContentModal
        visible={!!legalModal}
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    backgroundColor: theme.colors.borderLight,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  errorCard: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.error,
    ...theme.shadows.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBadge: {
    backgroundColor: theme.colors.errorBackground,
  },
  errorText: {
    color: theme.colors.error,
  },
  form: { gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  checkboxTouchable: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxError: {
    borderColor: theme.colors.error,
  },
  termsText: {
    flex: 1,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  submitBtn: { marginTop: theme.spacing.lg },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
});
