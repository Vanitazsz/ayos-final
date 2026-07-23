import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { useRequest } from '@/context/RequestContext';
import { useRequestStore } from '@/store/useRequestStore';

export default function RequestSuccessScreen() {
  const router = useRouter();
  const { resetRequest } = useRequest();
  const requestId = useRequestStore((state) => state.requestId);
  const bookingId = useRequestStore((state) => state.bookingId);
  const resetDraft = useRequestStore((state) => state.reset);

  const handleViewRequest = () => {
    if (bookingId) router.replace(`/booking/${bookingId}` as any);
    else if (requestId) router.replace(`/request/${requestId}` as any);
  };

  const handleBackToHome = () => {
    resetRequest();
    resetDraft();
    router.replace('/(tabs)/' as any);
  };

  const handleMessageWorker = () => {
    if (bookingId) router.push(`/messages/chat?id=${bookingId}` as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color={Colors.success} strokeWidth={1.5} />
        </View>
        
        <AppText variant="h2" weight="bold" align="center" style={styles.title}>
          {bookingId ? 'Booking Confirmed' : 'Request Posted Successfully!'}
        </AppText>
        
        <AppText variant="body" color={Colors.textSecondary} align="center" style={styles.subtitle}>
          {bookingId
            ? 'Your booking has been confirmed. You can review the details or message your worker.'
            : 'Your request is now live in the marketplace. Verified workers in your area can now view your request and submit their applications or bids.'}
        </AppText>

        <View style={styles.statusBox}>
          <AppText variant="h4" weight="bold" align="center" style={styles.statusBoxTitle}>
            What happens next?
          </AppText>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <AppText variant="bodySm" color={Colors.textSecondary} style={styles.stepText}>Wait for workers to apply</AppText>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <AppText variant="bodySm" color={Colors.textSecondary} style={styles.stepText}>Review their profiles and chat with them</AppText>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <AppText variant="bodySm" color={Colors.textSecondary} style={styles.stepText}>Accept the best worker and proceed to payment</AppText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton 
          label={bookingId ? 'View Booking' : 'View My Request'}
          onPress={handleViewRequest} 
          fullWidth
          size="lg"
          style={styles.primaryBtn}
        />
        {bookingId ? (
          <AppButton
            label="Message Worker"
            onPress={handleMessageWorker}
            variant="outline"
            fullWidth
            size="lg"
          />
        ) : null}
        <AppButton 
          label="Back to Home" 
          onPress={handleBackToHome} 
          variant="ghost"
          fullWidth
          size="lg"
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
    flexGrow: 1,
    padding: Layout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['6'],
  },
  title: {
    marginBottom: Spacing['4'],
  },
  subtitle: {
    marginBottom: Spacing['8'],
    paddingHorizontal: Spacing['2'],
    lineHeight: 22,
  },
  statusBox: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing['5'],
    borderRadius: Radius.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusBoxTitle: {
    marginBottom: Spacing['4'],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['3'],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
    marginRight: Spacing['3'],
  },
  stepText: {
    flex: 1,
  },
  footer: {
    padding: Layout.screenPadding,
    backgroundColor: Colors.background,
    gap: Spacing['3'],
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
  },
});
