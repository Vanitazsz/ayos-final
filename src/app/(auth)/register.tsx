import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { ArrowLeft, Briefcase, Info, Wrench } from 'lucide-react-native';

type RoleChoice = 'USER' | 'WORKER';

export default function RegisterScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(auth)/landing');

  const handleRoleSelect = (role: RoleChoice) => {
    if (role === 'WORKER') {
      router.push('/register-worker');
      return;
    }
    router.push('/(auth)/create-account');
  };

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: theme.spacing.lg,
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
          Get Started
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.roleContainer}>
          <Text style={[theme.typography.body1, styles.roleSubtitle]}>
            Choose how you want to use A-yos
          </Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelect('USER')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="I need services"
            >
              <View style={styles.roleIconCircle}>
                <Wrench size={30} color={theme.colors.primary} />
              </View>
              <Text style={styles.roleCardTitle}>I need services</Text>
              <Text style={styles.roleCardDesc}>
                Hire professionals for home and business services
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelect('WORKER')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="I provide services"
            >
              <View style={styles.roleIconCircle}>
                <Briefcase size={30} color={theme.colors.primary} />
              </View>
              <Text style={styles.roleCardTitle}>I provide services</Text>
              <Text style={styles.roleCardDesc}>
                Join as a verified service professional
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Info size={16} color={theme.colors.info} />
            <Text style={styles.infoText}>
              A-yos connects you with trusted service professionals.
            </Text>
          </View>
        </View>
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
    justifyContent: 'center',
  },
  roleContainer: { marginBottom: theme.spacing.lg },
  roleSubtitle: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  roleRow: {
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  roleIconCircle: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  roleCardDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.infoBackground,
    borderWidth: 1,
    borderColor: theme.colors.info,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
});
