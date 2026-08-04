import { styles } from './AuthRegisterScreen.styles';
import { View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { LegacyTextInput as TextInput } from '@/components/AppInput';
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
import type { useAuthRegisterScreenController } from '../hooks/useAuthRegisterScreenController';
import {
  emailRule,
  passwordRule,
  confirmPasswordRule,
} from '../logic/AuthRegisterScreenLogic';

export function RegisterView({
  model,
}: {
  model: ReturnType<typeof useAuthRegisterScreenController>;
}) {
  const {
    router,
    loading,
    acceptedTerms,
    setAcceptedTerms,
    selectedRole,
    setSelectedRole,
    control,
    handleSubmit,
    errors,
    password,
    onSubmit,
    handleRoleSelect,
    Controller,
    isValidPhilippinePhone,
  } = model;
  return (
    <Screen safeArea scrollable>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedRole) {
              setSelectedRole(null);
            } else {
              router.back();
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
                    label="Full name"
                    accessibilityLabel="Full name"
                    placeholder="Enter your full name"
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
                    label="Mobile number (+63…)"
                    accessibilityLabel="Mobile number (+63…)"
                    placeholder="Enter your mobile number"
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
                rules={emailRule}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Email"
                    accessibilityLabel="Email"
                    placeholder="Enter your email address"
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
                rules={passwordRule}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Password"
                    accessibilityLabel="Password"
                    placeholder="Create password"
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
                rules={confirmPasswordRule(password)}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Confirm password"
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
