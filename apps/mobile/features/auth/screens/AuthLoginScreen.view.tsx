import { styles } from './AuthLoginScreen.styles';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import type { useAuthLoginScreenController } from '../hooks/useAuthLoginScreenController';

export function LoginView({
  model,
}: {
  model: ReturnType<typeof useAuthLoginScreenController>;
}) {
  const {
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
  } = model;
  return (
    <Screen safeArea backgroundColor="#fff">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Sign in</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>New user? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.createAccount}>Create an account</Text>
              </TouchableOpacity>
            </View>
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
                    onBlur={onBlur}
                    onChangeText={(text) => {
                      setErrorMessage('');
                      onChange(text);
                    }}
                    value={value}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
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

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={onForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.socialPrompt}>
            Join With Your Favourite Social Media Account
          </Text>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={onGoogle}
              disabled={loading}
              accessibilityLabel="Continue with Google"
              accessibilityRole="button"
            >
              <Image
                source="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png"
                style={styles.socialIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          <Text style={styles.termsText}>
            By signing in with an account, you agree to SO&apos;s{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
