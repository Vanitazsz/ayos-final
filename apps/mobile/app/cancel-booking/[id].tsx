import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ChevronLeft, CheckCircle, FileQuestion } from 'lucide-react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/buttons/Button';
import { CancellationConfirmation } from '@/components/CancellationConfirmation';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { useGoBack } from '@/hooks/useGoBack';
import {
  cancelCustomerBooking,
  fetchBookingDetail,
  fetchCancellationReasons,
} from '@/services/bookings';
import {
  fetchPublishedContentPage,
  type ContentPageViewModel,
} from '@/services/contentPages';
import { showAlert } from '@/components/AppAlert';
import { useAuthStore } from '@/store/useAuthStore';

type CancellationReason =
  Awaited<ReturnType<typeof fetchCancellationReasons>>['data'][number];

const FALLBACK_REFUND_POLICY: ContentPageViewModel = {
  title: 'Refund Policy',
  version: '2026-07-23',
  updatedAt: '2026-07-23T00:00:00.000Z',
  body: 'Refund eligibility depends on the booking stage and the reason for cancellation. The cancellation policy displayed at the time of the request applies. Disputes are handled through A-YOS support.',
};

function policyBlocks(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export default function CancelBookingScreen() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const goBack = useGoBack('/(tabs)/bookings');
  const [bookingUnavailable, setBookingUnavailable] = useState(false);
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [selectedReason, setSelectedReason] =
    useState<CancellationReason | null>(null);
  const [refundPolicy, setRefundPolicy] = useState(FALLBACK_REFUND_POLICY);
  const [policyFallbackUsed, setPolicyFallbackUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    if (!bookingId) {
      setIsLoading(false);
      setLoadError('This booking could not be identified.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setBookingUnavailable(false);
    setSelectedReason(null);
    setPolicyFallbackUsed(false);

    const [bookingResult, reasonsResult] = await Promise.all([
      fetchBookingDetail(bookingId),
      fetchCancellationReasons(),
    ]);

    if (
      bookingResult.error ||
      !bookingResult.data ||
      ['COMPLETED', 'CANCELLED'].includes(bookingResult.data.status)
    ) {
      setBookingUnavailable(true);
      setIsLoading(false);
      return;
    }

    if (reasonsResult.error) {
      setLoadError(reasonsResult.error);
      setReasons([]);
    } else {
      const customerReasons = (reasonsResult.data ?? []).filter(
        (reason) => reason.applies_to === 'USER' || reason.applies_to === 'BOTH',
      );
      setReasons(customerReasons);
      if (customerReasons.length === 0) {
        setLoadError('No homeowner cancellation reasons are available.');
      }
    }

    try {
      const page = await fetchPublishedContentPage('REFUND_POLICY');
      if (page) {
        setRefundPolicy(page);
      } else {
        setRefundPolicy(FALLBACK_REFUND_POLICY);
        setPolicyFallbackUsed(true);
      }
    } catch {
      setRefundPolicy(FALLBACK_REFUND_POLICY);
      setPolicyFallbackUsed(true);
    }

    setIsLoading(false);
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== 'USER') return <Redirect href="/(worker)" />;

  const handleConfirm = async () => {
    if (!bookingId || !selectedReason || isSubmitting || loadError) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      await cancelCustomerBooking(
        bookingId,
        selectedReason.code,
        selectedReason.label,
        refundPolicy.version,
      );
      setShowConfirmation(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please try again.';
      setActionError(message);
      showAlert('Cancellation failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bookingId || bookingUnavailable) {
    return (
    <Screen safeArea fullWidth backgroundColor={theme.colors.background}>
        <View style={styles.centerState}>
          <FileQuestion size={42} color={theme.colors.primary} />
          <AppText variant="h3" weight="bold" align="center">
            Booking cannot be cancelled
          </AppText>
          <AppText
            variant="body"
            color={theme.colors.textSecondary}
            align="center"
          >
            This booking is no longer available for cancellation.
          </AppText>
          <Button title="Back to Bookings" variant="outlined" onPress={goBack} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to booking"
            hitSlop={12}
          >
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <AppText variant="h4" weight="bold">
            Cancel Booking
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleSection}>
            <AppText variant="h3" weight="bold">
              Why are you cancelling this booking?
            </AppText>
            <AppText variant="body" color={theme.colors.textSecondary}>
              Select a reason before confirming the cancellation.
            </AppText>
          </View>

          {isLoading ? (
            <View
              style={styles.stateCard}
              accessibilityRole="progressbar"
              accessibilityLabel="Loading cancellation options"
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <AppText variant="body" color={theme.colors.textSecondary}>
                Loading cancellation options…
              </AppText>
            </View>
          ) : loadError ? (
            <View style={styles.stateCard}>
              <AppText variant="h4" weight="bold" align="center">
                Unable to load cancellation options
              </AppText>
              <AppText
                variant="body"
                color={theme.colors.textSecondary}
                align="center"
              >
                {loadError}
              </AppText>
              <Button
                title="Retry"
                variant="outlined"
                onPress={() => setReloadToken((value) => value + 1)}
              />
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <AppText variant="label" color={theme.colors.textSecondary}>
                  Cancellation reason
                </AppText>
                <View style={styles.reasonList}>
                  {reasons.map((reason) => {
                    const selected = selectedReason?.code === reason.code;
                    return (
                      <Pressable
                        key={reason.code}
                        onPress={() => setSelectedReason(reason)}
                        style={[
                          styles.reasonOption,
                          selected && styles.reasonOptionSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={reason.label}
                        accessibilityState={{ selected }}
                      >
                        <AppText
                          variant="body"
                          weight={selected ? 'semiBold' : 'regular'}
                          color={
                            selected
                              ? theme.colors.primary
                              : theme.colors.textPrimary
                          }
                        >
                          {reason.label}
                        </AppText>
                        {selected ? (
                          <View style={styles.selectedLabel}>
                            <CheckCircle size={16} color={theme.colors.primary} />
                            <AppText
                              variant="caption"
                              weight="semiBold"
                              color={theme.colors.primary}
                            >
                              Selected
                            </AppText>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.policyCard}>
                <AppText variant="h4" weight="bold">
                  {refundPolicy.title}
                </AppText>
                <AppText variant="caption" color={theme.colors.textTertiary}>
                  Policy version {refundPolicy.version}
                </AppText>
                {policyFallbackUsed ? (
                  <AppText variant="caption" color={theme.colors.warning}>
                    The published policy is unavailable. Review the general
                    policy guidance below before continuing.
                  </AppText>
                ) : null}
                <View style={styles.policyBody}>
                  {policyBlocks(refundPolicy.body).map((block, index) =>
                    block.startsWith('## ') ? (
                      <AppText
                        key={`${index}-${block}`}
                        variant="body"
                        weight="semiBold"
                      >
                        {block.slice(3).trim()}
                      </AppText>
                    ) : (
                      <AppText
                        key={`${index}-${block}`}
                        variant="body"
                        color={theme.colors.textSecondary}
                      >
                        {block}
                      </AppText>
                    ),
                  )}
                </View>
              </View>

              {actionError ? (
                <AppText variant="body" color={theme.colors.error}>
                  {actionError}
                </AppText>
              ) : null}

              <Button
                title={isSubmitting ? 'Confirming Cancellation…' : 'Confirm Cancellation'}
                variant="danger"
                fullWidth
                disabled={!selectedReason || isSubmitting}
                onPress={() => void handleConfirm()}
              />
            </>
          )}
        </ScrollView>
      </View>

      <CancellationConfirmation
        visible={showConfirmation}
        customerName=""
        audience="customer"
        onViewBookings={() => {
          setShowConfirmation(false);
          router.replace('/(tabs)/bookings?filter=Cancelled');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  titleSection: {
    gap: theme.spacing.xs,
  },
  section: {
    gap: theme.spacing.sm,
  },
  reasonList: {
    gap: theme.spacing.sm,
  },
  reasonOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  reasonOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.infoBackground,
  },
  selectedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  policyCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  policyBody: {
    gap: theme.spacing.sm,
  },
  stateCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.layout.screenPadding,
  },
});
