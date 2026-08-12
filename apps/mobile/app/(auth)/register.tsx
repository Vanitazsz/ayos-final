import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useForm, Controller } from 'react-hook-form';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import { LegalContentModal } from '@/components/LegalContentModal';
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
  Info,
  AlertCircle,
} from 'lucide-react-native';
import { signUpCustomer } from '@/services/auth';
import { isValidPhilippinePhone } from '@/lib/workerRegistration';
import { showAlert } from '@/components/AppAlert';
import { PasswordRequirements } from '@/components/PasswordRequirements';

type RoleChoice = 'USER' | 'WORKER' | null;

export default function RegisterScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(auth)/landing');
  const { role } = useLocalSearchParams<{ role?: string }>();
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [formError, setFormError] = useState('');
  const [legalModal, setLegalModal] = useState<'TERMS' | 'PRIVACY' | null>(null);
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
            {/* Form Error Banner */}
            {formError ? (
              <View style={styles.errorCalloutBanner}>
                <AlertCircle size={20} color={theme.colors.error} style={{ marginRight: theme.spacing.sm, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorCalloutTitle}>Registration Issue</Text>
                  <Text style={styles.errorCalloutText}>{formError}</Text>
                </View>
              </View>
            ) : null}

            {/* Instruction Banner */}
            <View style={styles.instructionBanner}>
              <Info size={20} color={theme.colors.primary} style={styles.instructionIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.instructionTitle}>Registration Instructions</Text>
                <Text style={styles.instructionBody}>
                  • Fill out all required fields below (Name, Mobile Number +63, Email, and Password).{'\n'}
                  • Any missing or invalid field will be <Text style={{ color: theme.colors.error, fontWeight: '700' }}>highlighted in red</Text>.{'\n'}
                  • Check and accept the Terms & Conditions before submitting.
                </Text>
              </View>
            </View>

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
                    'Enter a valid PH mobile number, e.g. 09171234567 or +639171234567.',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    accessibilityLabel="Mobile number (e.g. 09171234567 or +639171234567)"
                    placeholder="Mobile number (e.g. 09171234567 or +63...)"
                    helperText="Example: 09171234567 or +639171234567 (11 digits starting with 09)"
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
                    message: 'Invalid email address format',
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
                  validate: (value) =>
                    /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value) ||
                    'Use 8+ characters with uppercase, number, and symbol',
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

              <PasswordRequirements
                password={password}
                confirmation={confirmPassword}
                showMatch
              />

              <View style={[
                styles.termsContainer,
                !!termsError && styles.termsContainerError,
              ]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setAcceptedTerms(!acceptedTerms);
                    if (!acceptedTerms) setTermsError('');
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                  style={styles.checkboxTouchable}
                >
                  {acceptedTerms ? (
                    <CheckSquare color={theme.colors.primary} size={20} />
                  ) : (
                    <Square color={termsError ? theme.colors.error : theme.colors.textSecondary} size={20} />
                  )}
                </TouchableOpacity>
                <Text style={[theme.typography.body2, styles.termsText]}>
                  <Text onPress={() => {
                    setAcceptedTerms(!acceptedTerms);
                    if (!acceptedTerms) setTermsError('');
                  }}>
                    I accept the{' '}
                  </Text>
                  <Text
                    style={styles.termsLink}
                    onPress={() => setLegalModal('TERMS')}
                  >
                    Terms and Conditions
                  </Text>
                  <Text onPress={() => {
                    setAcceptedTerms(!acceptedTerms);
                    if (!acceptedTerms) setTermsError('');
                  }}>
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
                <Text style={styles.termsErrorText}>
                  ⚠️ {termsError}
                </Text>
              )}
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

      <LegalContentModal
        visible={!!legalModal}
        type={legalModal}
        onClose={() => setLegalModal(null)}
      />
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
  errorCalloutBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorCalloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorCalloutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  instructionIcon: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  instructionBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  form: { marginBottom: theme.spacing.xl },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  termsContainerError: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  termsErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  checkboxTouchable: {
    paddingTop: 2,
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
