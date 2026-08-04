import { styles } from './PaymentSuccessScreen.styles';
import { View, Text } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import { CheckCircle2 } from 'lucide-react-native';
import type { usePaymentSuccessScreenController } from '../hooks/usePaymentSuccessScreenController';
import { formatPesoWithSpace } from '@/utils/format';

export function PaymentSuccessView({
  model,
}: {
  model: ReturnType<typeof usePaymentSuccessScreenController>;
}) {
  const { router, id, payment, error, displayAmount, displayRef, displayDate } =
    model;
  return error ? (
    <Screen safeArea>
      <View style={styles.container}>
        <Text style={[theme.typography.h3, styles.title]}>
          Payment confirmation unavailable
        </Text>
        <Text style={[theme.typography.body1, styles.subtitle]}>{error}</Text>
        <Button
          title="Back to Booking"
          onPress={() => router.replace('/(tabs)/bookings?filter=Completed')}
          fullWidth
        />
      </View>
    </Screen>
  ) : !payment ? (
    <Screen safeArea>
      <View style={styles.container}>
        <Text style={[theme.typography.body1, styles.subtitle]}>
          Loading confirmed payment…
        </Text>
      </View>
    </Screen>
  ) : (
    <Screen safeArea>
      <View style={styles.container}>
        <CheckCircle2
          color={theme.colors.success}
          size={80}
          style={styles.icon}
        />
        <Text style={[theme.typography.h1, styles.title]}>
          Payment Successful!
        </Text>
        <Text style={[theme.typography.body1, styles.subtitle]}>
          The cash payment of {formatPesoWithSpace(displayAmount)} is confirmed.
        </Text>

        <View style={styles.receiptCard}>
          <View style={styles.row}>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              Reference No.
            </Text>
            <Text style={theme.typography.label}>{displayRef}</Text>
          </View>
          <View style={styles.row}>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              Date
            </Text>
            <Text style={theme.typography.label}>{displayDate}</Text>
          </View>
          <View
            style={[
              styles.row,
              {
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                paddingTop: theme.spacing.md,
                marginTop: theme.spacing.sm,
              },
            ]}
          >
            <Text style={theme.typography.h4}>Total Paid</Text>
            <Text
              style={[theme.typography.h3, { color: theme.colors.primary }]}
            >
              {formatPesoWithSpace(displayAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Rate the Service"
            onPress={() => router.replace(`/review/${id}`)}
            fullWidth
            style={styles.actionBtn}
          />
          <Button
            title="Back to Home"
            variant="ghost"
            onPress={() => router.replace('/(tabs)/home')}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}
