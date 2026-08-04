import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, DollarSign } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { useRequest } from '@/context/RequestContext';

export default function PaymentReceivedScreen() {
  const router = useRouter();
  const { resetRequest } = useRequest();

  const handleGoHome = () => {
    resetRequest();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={80} color={Colors.success} strokeWidth={1.5} />
          <View style={styles.badgeContainer}>
            <DollarSign size={24} color={Colors.white} strokeWidth={2.5} />
          </View>
        </View>
        
        <AppText variant="h2" style={styles.title}>Payment Released!</AppText>
        <AppText variant="body" style={styles.subtitle}>
          The funds have been successfully transferred to the worker for the completed job.
        </AppText>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <CheckCircle2 size={24} color={Colors.primary} />
            <View style={styles.cardInfo}>
              <AppText style={{ fontWeight: '600' }}>Job Completed</AppText>
              <AppText variant="caption" style={{ color: Colors.textSecondary }}>Thank you for using A-yos!</AppText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton 
          label="Back to Home" 
          size="xl"
          onPress={handleGoHome} 
          style={{ backgroundColor: Colors.primary }}
          labelStyle={{ color: Colors.white }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing[6],
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: Colors.cta,
    borderRadius: Radius.full,
    padding: Spacing[1],
    borderWidth: 3,
    borderColor: Colors.background,
  },
  title: {
    fontWeight: '700',
    marginBottom: Spacing[2],
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing[8],
    paddingHorizontal: Spacing[4],
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  cardInfo: {
    flex: 1,
  },
  footer: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
});
