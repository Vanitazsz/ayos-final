import React, { useState } from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  CheckSquare,
  Square,
  Briefcase,
  Wrench,
} from 'lucide-react-native';
import { signUpCustomer } from '@/services/auth';
import { isValidPhilippinePhone } from '@/lib/workerRegistration';
import { showAlert } from '@/components/AppAlert';

type RoleChoice = 'USER' | 'WORKER' | null;

export default function RegisterScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(auth)/landing');
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleChoice>(
    role === 'USER' ? 'USER' : null,
  );

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

  const onSubmit = async (data: any) => {
    if (!acceptedTerms) {
      alert('Please accept the terms and conditions.');
      return;
    }

    setLoading(true);
    try {
      await signUpCustomer(data);
      router.push({ pathname: '/(auth)/otp', params: { email: data.email } });
    } catch (error) {
      showAlert(
        'Registration failed',
        error instanceof Error ? error.message : 'Unable to register',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: RoleChoice) => {
    if (role === 'WORKER') {
      router.push('/register-worker');
      return;
    }
    setSelectedRole(role);
  };

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedRole) {
              setSelectedRole(null);
            } else {
              goBack();
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[theme.typography.h1, styles.title]}
        >
          {selectedRole === 'USER' ? 'Create account' : 'Get Started'}
        </Text>
        <Text style={[theme.typography.body1, styles.subtitle]}>
          {selectedRole === 'USER'
            ? 'Sign up to hire top-rated service professionals.'
            : 'A-yos connects you with trusted service professionals.'}
        </Text>

        <View style={styles.roleContainer}>
          <Text style={[theme.typography.body1, styles.roleSubtitle]}>
            Choose how you want to use A-yos
          </Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'USER' && styles.roleCardSelected,
              ]}
              onPress={() => handleRoleSelect('USER')}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.roleIconCircle,
                  selectedRole === 'USER' && styles.roleIconCircleSelected,
                ]}
              >
                <Wrench
                  size={28}
                  color={
                    selectedRole === 'USER' ? '#fff' : theme.colors.primary
                  }
                />
              </View>
              <Text
                style={[
                  styles.roleCardTitle,
                  selectedRole === 'USER' && styles.roleCardTitleSelected,
                ]}
              >
                I need services
              </Text>
              <Text
                style={[
                  styles.roleCardDesc,
                  selectedRole === 'USER' && styles.roleCardDescSelected,
                ]}
              >
                Hire professionals for home and business services
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'WORKER' && styles.roleCardSelected,
              ]}
              onPress={() => handleRoleSelect('WORKER')}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.roleIconCircle,
                  selectedRole === 'WORKER' && styles.roleIconCircleSelected,
                ]}
              >
                <Briefcase
                  size={28}
                  color={
                    selectedRole === 'WORKER' ? '#fff' : theme.colors.primary
                  }
                />
              </View>
              <Text
                style={[
                  styles.roleCardTitle,
                  selectedRole === 'WORKER' && styles.roleCardTitleSelected,
                ]}
              >
                I provide services
              </Text>
              <Text
                style={[
                  styles.roleCardDesc,
                  selectedRole === 'WORKER' && styles.roleCardDescSelected,
                ]}
              >
                Join as a verified service professional
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedRole === 'USER' && (
          <>
            <View style={styles.form}>
              <Controller
                control={control}
                rules={{ required: 'Full name is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Full name"
                    placeholder="Full name"
                    leftIcon={User}
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
                    'Enter a mobile number with country code, for example +639171234567.',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Mobile number (+63…)"
                    placeholder="Mobile number (+63…)"
                    leftIcon={Phone}
                    keyboardType="phone-pad"
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
                    message: 'Invalid email',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Email"
                    placeholder="Email Address"
                    leftIcon={Mail}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                  validate: (value) =>
                    /[A-Z]/.test(value) ||
                    'Password must include an uppercase letter.',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Password"
                    placeholder="Password"
                    leftIcon={Lock}
                    isPassword
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
                  <TextInput
                    accessibilityLabel="Confirm password"
                    placeholder="Confirm password"
                    leftIcon={Lock}
                    isPassword
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.confirmPassword?.message}
                  />
                )}
                name="confirmPassword"
              />

              <TouchableOpacity
                style={styles.termsContainer}
                activeOpacity={0.7}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                accessibilityRole="switch"
                accessibilityState={{ checked: acceptedTerms }}
                aria-checked={acceptedTerms}
              >
                {acceptedTerms ? (
                  <CheckSquare color={theme.colors.primary} size={20} />
                ) : (
                  <Square color={theme.colors.textSecondary} size={20} />
                )}
                <Text style={[theme.typography.body2, styles.termsText]}>
                  I accept the{' '}
                  <Text style={styles.termsLink}>Terms and Conditions</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Send email code"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              fullWidth
              style={styles.submitBtn}
            />
          </>
        )}

        <View style={styles.footer}>
          <Text style={theme.typography.body2}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text
              style={[theme.typography.button, { color: theme.colors.primary }]}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </View>
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
  content: { flex: 1, paddingBottom: theme.spacing.xxxl },
  title: { color: theme.colors.textPrimary, marginBottom: theme.spacing.xs },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  roleContainer: { marginBottom: theme.spacing.xl },
  roleSubtitle: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  roleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  roleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  roleIconCircleSelected: {
    backgroundColor: theme.colors.primary,
  },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleCardTitleSelected: {
    color: theme.colors.primary,
  },
  roleCardDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  roleCardDescSelected: {
    color: theme.colors.primary,
  },
  form: { marginBottom: theme.spacing.xl },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  termsText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  termsLink: { color: theme.colors.primary, fontWeight: '600' },
  submitBtn: { marginBottom: theme.spacing.xl },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
