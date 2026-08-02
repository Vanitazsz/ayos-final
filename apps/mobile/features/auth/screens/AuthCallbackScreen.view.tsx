import { styles } from './AuthCallbackScreen.styles';
import { ActivityIndicator, Text, View } from 'react-native';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import type { useAuthCallbackScreenController } from '../hooks/useAuthCallbackScreenController';

export function AuthCallbackView({
  model,
}: {
  model: ReturnType<typeof useAuthCallbackScreenController>;
}) {
  const { router, state, retrying, retry } = model;
  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        {state.status === 'loading' ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <AlertCircle size={32} color={theme.colors.error} />
        )}
        <Text style={styles.title}>
          {state.status === 'loading'
            ? 'Signing you in…'
            : 'Google sign-in could not be completed'}
        </Text>
        {state.status === 'error' ? (
          <Text style={styles.message}>{state.message}</Text>
        ) : (
          <Text style={styles.message}>
            Checking your Supabase account and profile.
          </Text>
        )}
        {state.status === 'error' ? (
          <View style={styles.actions}>
            <Button
              title="Try Google sign-in again"
              icon={RefreshCw}
              loading={retrying}
              onPress={retry}
              fullWidth
            />
            <Button
              title="Back to sign in"
              icon={ArrowLeft}
              variant="ghost"
              onPress={() => router.replace('/(auth)/login')}
              fullWidth
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
