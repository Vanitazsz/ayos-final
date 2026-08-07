import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { CheckCircle2 } from 'lucide-react-native';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  const handleViewBooking = () => {
    if (bookingId) {
      router.replace(`/booking/${bookingId}`);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleHome = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <CheckCircle2 color={theme.colors.success} size={64} />
        </View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Your payment has been confirmed. Thank you for using A-yos.
        </Text>

        <View style={styles.actions}>
          <Button
            title="View Booking Details"
            onPress={handleViewBooking}
            fullWidth
          />
          <Button
            title="Back to Home"
            variant="outlined"
            onPress={handleHome}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.xxl,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  actions: {
    width: '100%',
    gap: theme.spacing.sm,
  },
});
