import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { changeMyPassword } from '@/services/profile';
import {
  closePasswordRecoverySession,
  isPasswordRecoveryFlow,
  loadPasswordRecoverySession,
  markPasswordRecoveryPending,
  PASSWORD_RECOVERY_ERROR,
} from '@/services/passwordRecovery';
import { getPasswordRequirementState } from '@/utils/passwordRequirements';
import { useAuthStore } from '@/store/useAuthStore';

type ResetStatus = 'loading' | 'ready' | 'submitting' | 'invalid';

function parameter(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; flow?: string }>();
  const startPasswordRecovery = useAuthStore(
    (state) => state.startPasswordRecovery,
  );
  const clearPasswordRecovery = useAuthStore(
    (state) => state.clearPasswordRecovery,
  );
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const [status, setStatus] = useState<ResetStatus>('loading');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const code = parameter(params.code);
  const flow = parameter(params.flow);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      startPasswordRecovery();
      try {
        await markPasswordRecoveryPending();
      } catch (error) {
        console.warn('[auth] Could not persist password recovery lock:', error);
      }
      if (!isPasswordRecoveryFlow(flow)) {
        if (!cancelled) {
          setErrorMessage(PASSWORD_RECOVERY_ERROR);
          setStatus('invalid');
        }
        return;
      }

      try {
        await loadPasswordRecoverySession(code);
        if (!cancelled) setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : PASSWORD_RECOVERY_ERROR,
          );
          setStatus('invalid');
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [code, flow, startPasswordRecovery]);

  const requirements = getPasswordRequirementState(password, confirmation);
  const passwordIsValid =
    requirements.minLength &&
    requirements.uppercase &&
    requirements.number &&
    requirements.symbol &&
    requirements.matches;

  const submit = async () => {
    setErrorMessage('');
    if (!passwordIsValid) {
      setErrorMessage('Choose a password that meets all the requirements.');
      return;
    }

    setStatus('submitting');
    try {
      await changeMyPassword(password);
      await closePasswordRecoverySession();
      clearPasswordRecovery();
      setSessionUser(null);
      router.replace('/(auth)/login');
    } catch (error) {
      setStatus('ready');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to change your password. Please try again.',
      );
    }
  };

  const leaveRecovery = async () => {
    setErrorMessage('');
    try {
      await closePasswordRecoverySession();
      clearPasswordRecovery();
      setSessionUser(null);
      router.replace('/(auth)/login');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to close this password reset session.',
      );
    }
  };

  const isBusy = status === 'loading' || status === 'submitting';

  return (
    <Screen scrollable safeArea backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        {status === 'loading' ? (
          <ActivityIndicator color={theme.colors.primary} size="large" />
        ) : (
          <Lock color={theme.colors.primary} size={36} />
        )}
        <AppText variant="h2" align="center" style={styles.title}>
          Create a new password
        </AppText>
        <AppText variant="body" color={theme.colors.textSecondary} align="center">
          Set a new password before continuing to your A-YOS account.
        </AppText>

        {status === 'invalid' ? (
          <View style={styles.messageBlock} accessibilityRole="alert">
            <AppText color={theme.colors.error} align="center">
              {errorMessage}
            </AppText>
          </View>
        ) : status === 'loading' ? null : (
          <View style={styles.form}>
            {errorMessage ? (
              <AppText color={theme.colors.error} align="center" accessibilityRole="alert">
                {errorMessage}
              </AppText>
            ) : null}
            <AppInput
              label="New password"
              placeholder="Enter a new password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setErrorMessage('');
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
              leftIcon={<Lock color={theme.colors.textSecondary} size={20} />}
              rightIcon={
                showPassword ? (
                  <EyeOff color={theme.colors.textSecondary} size={20} />
                ) : (
                  <Eye color={theme.colors.textSecondary} size={20} />
                )
              }
              onRightIconPress={() => setShowPassword((visible) => !visible)}
            />
            <PasswordRequirements
              password={password}
              confirmation={confirmation}
              showMatch
            />
            <AppInput
              label="Confirm new password"
              placeholder="Re-enter your new password"
              value={confirmation}
              onChangeText={(value) => {
                setConfirmation(value);
                setErrorMessage('');
              }}
              secureTextEntry={!showConfirmation}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
              leftIcon={<Lock color={theme.colors.textSecondary} size={20} />}
              rightIcon={
                showConfirmation ? (
                  <EyeOff color={theme.colors.textSecondary} size={20} />
                ) : (
                  <Eye color={theme.colors.textSecondary} size={20} />
                )
              }
              onRightIconPress={() =>
                setShowConfirmation((visible) => !visible)
              }
            />
            <AppButton
              label="Set new password"
              onPress={submit}
              loading={status === 'submitting'}
              disabled={isBusy}
              fullWidth
              style={styles.submit}
            />
          </View>
        )}

        {status !== 'loading' ? (
          <AppButton
            label="Back to sign in"
            variant="ghost"
            icon={<ArrowLeft color={theme.colors.primary} size={20} />}
            onPress={() => void leaveRecovery()}
            disabled={status === 'submitting'}
            fullWidth
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  title: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  messageBlock: { marginTop: theme.spacing.xl },
  form: { gap: theme.spacing.md, marginTop: theme.spacing.xl },
  submit: { marginTop: theme.spacing.sm },
});
