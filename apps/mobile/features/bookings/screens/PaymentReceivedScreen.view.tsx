import { styles } from './PaymentReceivedScreen.styles';
import { View } from 'react-native';
import { CheckCircle2, DollarSign } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import type { usePaymentReceivedScreenController } from '../hooks/usePaymentReceivedScreenController';

export function PaymentReceivedView({
  model,
}: {
  model: ReturnType<typeof usePaymentReceivedScreenController>;
}) {
  const { handleGoHome } = model;
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={80} color={Colors.success} strokeWidth={1.5} />
          <View style={styles.badgeContainer}>
            <DollarSign size={24} color={Colors.white} strokeWidth={2.5} />
          </View>
        </View>

        <AppText variant="h2" style={styles.title}>
          Payment Released!
        </AppText>
        <AppText variant="body" style={styles.subtitle}>
          The funds have been successfully transferred to the worker for the
          completed job.
        </AppText>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <CheckCircle2 size={24} color={Colors.primary} />
            <View style={styles.cardInfo}>
              <AppText style={{ fontWeight: '600' }}>Job Completed</AppText>
              <AppText
                variant="caption"
                style={{ color: Colors.textSecondary }}
              >
                Thank you for using A-yos!
              </AppText>
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
