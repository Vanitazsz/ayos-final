import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '@/components/layout/Screen';
import { LegalContentModal } from '@/components/LegalContentModal';
import { theme } from '@/constants/theme';
import {
  loadCurrentUser,
  requestPasswordReset,
  signInWithGoogle,
  signInWithPassword,
} from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { showAlert } from '@/components/AppAlert';

const REMEMBER_ME_EMAIL_KEY = 'remember_me_email';

export default function LoginScreen() {
  const router = useRouter();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const sessionNotice = useAuthStore((state) => state.sessionNotice);
  const clearSessionNotice = useAuthStore((state) => state.clearSessionNotice);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [legalModal, setLegalModal] = useState<'TERMS' | 'PRIVACY' | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(''), 5_000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    async function loadRememberedUser() {
      try {
        const savedEmail = await AsyncStorage.getItem(REMEMBER_ME_EMAIL_KEY);
        if (savedEmail) {
          setValue('email', savedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.warn('[login] Failed to load remembered email:', err);
      }
    }
    loadRememberedUser();
  }, [setValue]);

  const onSubmit = async (data: any) => {
    clearSessionNotice();
    setErrorMessage('');
    setLoading(true);
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(
          REMEMBER_ME_EMAIL_KEY,
          data.email.trim().toLowerCase(),
        );
      } else {
        await AsyncStorage.removeItem(REMEMBER_ME_EMAIL_KEY);
      }
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
      const signedIn = await signInWithGoogle();
      if (!signedIn) return;
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
    if (resetLoading) return;
    const email = getValues('email');
    if (!email) {
      showAlert('Email required', 'Enter your email address first.');
      return;
    }
    setResetLoading(true);
    try {
      await requestPasswordReset(email);
      showAlert(
        'Check your email',
        'A secure password reset link has been sent. Only the newest link is valid, so use the latest email.',
      );
    } catch (error) {
      showAlert(
        'Reset failed',
        error instanceof Error ? error.message : 'Unable to send reset email',
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Screen safeArea fullWidth backgroundColor="#fff">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Welcome back
            </Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            {sessionNotice ? (
              <View style={styles.sessionNotice} accessibilityRole="alert">
                <Text style={styles.sessionNoticeText}>{sessionNotice}</Text>
              </View>
            ) : null}
            {errorMessage ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={onGoogle}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              accessibilityState={{ disabled: loading }}
            >
              <Image
                source="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png"
                style={styles.googleIcon}
                contentFit="contain"
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
            </View>
            <Controller
              control={control}
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <Mail
                    color={theme.colors.textSecondary}
                    size={20}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={theme.colors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      setErrorMessage('');
                      onChange(text);
                    }}
                    value={value}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    accessibilityLabel="Email Address"
                  />
                </View>
              )}
              name="email"
            />
            {errors.email && (
              <Text style={styles.errorText}>
                {errors.email.message as string}
              </Text>
            )}

            <Controller
              control={control}
              rules={{ required: 'Password is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                  <Lock
                    color={theme.colors.textSecondary}
                    size={20}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.textTertiary}
                    secureTextEntry={!showPassword}
                    numberOfLines={1}
                    multiline={false}
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      setErrorMessage('');
                      onChange(text);
                    }}
                    value={value}
                    accessibilityLabel="Password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <Eye color={theme.colors.textSecondary} size={20} />
                    ) : (
                      <EyeOff color={theme.colors.textSecondary} size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
              name="password"
            />
            {errors.password && (
              <Text style={styles.errorText}>
                {errors.password.message as string}
              </Text>
            )}

            <View style={styles.rememberAndForgotRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                aria-checked={rememberMe}
                accessibilityLabel="Remember me"
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Check color="#ffffff" size={12} strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={onForgotPassword}
                disabled={loading || resetLoading}
                accessibilityState={{ disabled: loading || resetLoading }}
              >
                <Text style={styles.forgotPasswordText}>
                  {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Login"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupDivider}>
            <View style={styles.signupDividerLine} />
            <Text style={styles.signupDividerText}>
              New user?{' '}
              <Text
                style={styles.createAccount}
                onPress={() => router.push('/(auth)/register')}
                accessibilityRole="link"
                accessibilityLabel="Create an account"
              >
                Create an account
              </Text>
            </Text>
            <View style={styles.signupDividerLine} />
          </View>

          <View style={{ flex: 1 }} />

          <Text style={styles.termsText}>
            By signing in with an account, you agree to SO&apos;s{'\n'}
            <Text
              style={styles.termsLink}
              onPress={() => setLegalModal('TERMS')}
              accessibilityRole="link"
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => setLegalModal('PRIVACY')}
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <LegalContentModal
        visible={!!legalModal}
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sessionNotice: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  sessionNoticeText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  createAccount: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  form: {
    marginBottom: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...theme.typography.body1,
    height: 24,
    paddingVertical: 0,
    textAlignVertical: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as TextStyle)
      : {}),
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  rememberAndForgotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rememberMeText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  forgotPassword: {
    paddingVertical: 6,
  },
  forgotPasswordText: {
    ...theme.typography.body2,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    ...theme.typography.button,
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  signupDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 44,
    marginBottom: 32,
  },
  signupDividerText: {
    ...theme.typography.body2,
    marginHorizontal: 16,
    color: theme.colors.textSecondary,
  },
  signupDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.textTertiary,
    ...theme.typography.body2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
    marginBottom: 24,
    gap: 12,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  termsText: {
    textAlign: 'center',
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    lineHeight: 20,
  },
  termsLink: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
});
