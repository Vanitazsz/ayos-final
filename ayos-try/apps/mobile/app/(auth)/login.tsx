import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { loadCurrentUser, requestPasswordReset, signInWithGoogle, signInWithPassword } from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { Mail, Lock, Eye, EyeOff, Briefcase } from 'lucide-react-native';
import { Image } from 'expo-image';

export default function LoginScreen() {
  const router = useRouter();
  const setSessionUser = useAuthStore(state => state.setSessionUser);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, getValues, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data: any) => {
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
            : (error as any)?.message ??
              (error as any)?.error_description ??
              'Unable to sign in. Please try again.';
      Alert.alert('Sign in failed', msg);
    } finally { setLoading(false); }
  };

  const onGoogle = async () => { setLoading(true); try { await signInWithGoogle(); const user=await loadCurrentUser(); setSessionUser(user); router.replace(user?.role === 'WORKER' ? '/(worker)' : '/(tabs)/home'); } catch(error) { console.error('[login] google signIn error:', error); const msg = typeof error === 'string' ? error : error instanceof Error ? error.message : (error as any)?.message ?? 'Unable to sign in with Google.'; Alert.alert('Google sign in', msg); } finally { setLoading(false); } };
  const onForgotPassword = async () => { const email=getValues('email'); if(!email){Alert.alert('Email required','Enter your email address first.');return;} try{await requestPasswordReset(email);Alert.alert('Check your email','A secure password reset link has been sent.');}catch(error){Alert.alert('Reset failed',error instanceof Error?error.message:'Unable to send reset email');} };

  return (
    <Screen safeArea backgroundColor="#fff">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
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
            <Controller
              control={control}
              rules={{ required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputWrapper}>
                  <Mail color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={theme.colors.textTertiary}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}
              name="email"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message as string}</Text>}

            <Controller
              control={control}
              rules={{ required: 'Password is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.inputWrapper, { marginTop: 16 }]}>
                  <Lock color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.textTertiary}
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <Eye color={theme.colors.textSecondary} size={20} /> : <EyeOff color={theme.colors.textSecondary} size={20} />}
                  </TouchableOpacity>
                </View>
              )}
              name="password"
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message as string}</Text>}

            <TouchableOpacity style={styles.forgotPassword} onPress={onForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.socialPrompt}>Join With Your Favourite Social Media Account</Text>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} onPress={onGoogle} disabled={loading} accessibilityLabel="Continue with Google">
              <Image source="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png" style={styles.socialIcon} contentFit="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { opacity: 0.45 }]} disabled accessibilityLabel="X login unavailable">
              <Image source="https://freelogopng.com/images/all_img/1690643591twitter-x-logo-png.png" style={styles.socialIcon} contentFit="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { opacity: 0.45 }]} disabled accessibilityLabel="Apple login unavailable">
              <Image source="https://cdn3.iconfinder.com/data/icons/picons-social/57/16-apple-512.png" style={[styles.socialIcon, { width: 22, height: 26 }]} contentFit="contain" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.workerSwitchBtn}
            onPress={() => router.push('/register-worker')}
          >
            <Briefcase color={theme.colors.textSecondary} size={18} />
            <Text style={styles.workerSwitchText}>Register as Worker</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <Text style={styles.termsText}>
            By signing in with an account, you agree to SO&apos;s{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  createAccount: {
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
  },
  form: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    height: '100%',
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
  forgotPassword: {
    alignSelf: 'flex-start',
    marginTop: 16,
    marginBottom: 32,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1e3a8a',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialPrompt: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
    marginBottom: 24,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  termsLink: {
    color: '#333',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  workerSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 20,
  },
  workerSwitchText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
  },
});
