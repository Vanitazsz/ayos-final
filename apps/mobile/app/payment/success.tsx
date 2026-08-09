import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { CheckCircle2 } from 'lucide-react-native';
import { showAlert } from '@/components/AppAlert';
import { fetchReviewForBooking } from '@/services/reviews';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { bookingId: bookingIdParam, id } = useLocalSearchParams<{
    bookingId?: string;
    id?: string;
  }>();
  const bookingId = bookingIdParam ?? id;
  const [reviewState, setReviewState] = React.useState<
    'checking' | 'available' | 'submitted' | 'unavailable'
  >(bookingId ? 'checking' : 'unavailable');

  React.useEffect(() => {
    if (!bookingId) return;
    let active = true;
    void fetchReviewForBooking(bookingId)
      .then((review) => {
        if (active) setReviewState(review ? 'submitted' : 'available');
      })
      .catch(() => {
        if (active) setReviewState('unavailable');
      });
    return () => {
      active = false;
    };
  }, [bookingId]);

  const handleViewBooking = () => {
    if (bookingId) {
      router.replace(`/booking-summary/${bookingId}`);
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleReview = () => {
    if (!bookingId) {
      showAlert('Review unavailable', 'The booking reference is missing.');
      return;
    }
    if (reviewState === 'submitted') {
      showAlert('Review already submitted', 'You have already rated this booking.');
      return;
    }
    if (reviewState !== 'available') {
      showAlert(
        'Review unavailable',
        'We could not verify the review status. Please try again from your booking details.',
      );
      return;
    }
    router.push(`/review/${bookingId}`);
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
          {reviewState !== 'submitted' && (
            <Button
              title="Rate your experience"
              variant="outlined"
              onPress={handleReview}
              disabled={reviewState === 'checking'}
              fullWidth
            />
          )}
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
