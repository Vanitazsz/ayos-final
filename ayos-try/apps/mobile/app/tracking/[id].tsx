import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Wrench,
} from 'lucide-react-native';
import {
  fetchBookingTracking,
  subscribeToTable,
} from '@/services/api';
import { supabase } from '@/lib/supabase';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { BookingChat } from '@/components/booking/BookingChat';

const STATUS_STEP_MAP: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  WORKER_PREPARING: 1,
  WORKER_EN_ROUTE: 2,
  WORKER_ARRIVED: 3,
  SERVICE_STARTED: 4,
  IN_PROGRESS: 4,
  COMPLETED: 5,
};

const STATUS_INFO: Record<string, { title: string; subtitle: string; icon: any }> = {
  PENDING: { title: 'Waiting for Provider', subtitle: 'Your booking has been sent. A provider will accept shortly.', icon: Clock },
  ACCEPTED: { title: 'Provider Accepted', subtitle: 'Your provider has accepted the job and is getting ready.', icon: CheckCircle2 },
  WORKER_PREPARING: { title: 'Provider Preparing', subtitle: 'Your provider is preparing to head to your location.', icon: Clock },
  WORKER_EN_ROUTE: { title: 'Provider On The Way', subtitle: 'Your provider is en route to your location.', icon: MapPin },
  WORKER_ARRIVED: { title: 'Provider Has Arrived', subtitle: 'Your provider has arrived at your location.', icon: MapPin },
  SERVICE_STARTED: { title: 'Service In Progress', subtitle: 'Work has begun on your service request.', icon: Wrench },
  IN_PROGRESS: { title: 'Service In Progress', subtitle: 'Work is currently being done.', icon: Wrench },
  COMPLETED: { title: 'Service Completed', subtitle: 'Your service has been completed. Please confirm and pay.', icon: CheckCircle2 },
  CANCELLED: { title: 'Booking Cancelled', subtitle: 'This booking has been cancelled.', icon: Clock },
};

const TIMELINE_STEPS = [
  { id: '1', title: 'Booking Confirmed', subtitle: 'Your booking has been placed' },
  { id: '2', title: 'Provider Accepted', subtitle: 'A provider accepted your job' },
  { id: '3', title: 'Provider En Route', subtitle: 'Provider is on the way' },
  { id: '4', title: 'Provider Arrived', subtitle: 'Provider has arrived' },
  { id: '5', title: 'Service In Progress', subtitle: 'Work has started' },
  { id: '6', title: 'Completed', subtitle: 'Service finished' },
];

export default function TrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [tracking, setTracking] = useState<any>(null);
  const bookingId = Array.isArray(id) ? id[0] : id;

  const workerStatus = tracking?.booking?.status as string | undefined;
  useEffect(() => {
    if (!bookingId) return;
    const load = () =>
      void fetchBookingTracking(bookingId)
        .then(setTracking)
        .catch(() => setTracking(null));
    load();
    const stopLocation = subscribeToTable(
      'location_updates',
      load,
      `booking_id=eq.${bookingId}`,
    );
    const stopBooking = subscribeToTable(
      'bookings',
      load,
      `id=eq.${bookingId}`,
    );
    const stopStatusEvents = subscribeToTable(
      'booking_status_events',
      load,
      `booking_id=eq.${bookingId}`,
    );
    const poll = setInterval(() => {
      if (!tracking?.booking?.status || !['COMPLETED', 'CANCELLED'].includes(tracking.booking.status)) load();
    }, 10000);
    return () => {
      stopLocation();
      stopBooking();
      stopStatusEvents();
      clearInterval(poll);
    };
  }, [bookingId, tracking?.booking?.status]);

  const stepIndex = useMemo(() => {
    return workerStatus && STATUS_STEP_MAP[workerStatus] !== undefined
      ? STATUS_STEP_MAP[workerStatus]
      : 0;
  }, [workerStatus]);

  const handleComplete = () => {
    router.push(`/payment/${id}`);
  };

  const address = tracking?.booking?.service_requests?.addresses;
  const latest = tracking?.updates?.[0];
  const statusInfo = STATUS_INFO[workerStatus ?? ''] ?? { title: workerStatus?.replaceAll('_', ' ') ?? 'Loading...', subtitle: '', icon: Clock };
  const StatusIcon = statusInfo.icon;
  const isCompleted = workerStatus === 'COMPLETED';
  const isCancelled = workerStatus === 'CANCELLED';
  const isActive = !isCompleted && !isCancelled;

  return (
    <Screen safeArea backgroundColor={theme.colors.surface}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Booking Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Area - only show when active and location available */}
        {isActive && address?.latitude != null && address?.longitude != null && (
          <View style={styles.mapContainer}>
            <BookingMap
              bookingId={bookingId}
              destinationLat={Number(address.latitude)}
              destinationLng={Number(address.longitude)}
              destinationAddress={[
                address.line1,
                address.barangay,
                address.city,
              ]
                .filter(Boolean)
                .join(', ')}
              startLat={
                tracking?.booking?.worker_start_lat == null
                  ? undefined
                  : Number(tracking.booking.worker_start_lat)
              }
              startLng={
                tracking?.booking?.worker_start_lng == null
                  ? undefined
                  : Number(tracking.booking.worker_start_lng)
              }
              workerLat={latest ? Number(latest.latitude) : undefined}
              workerLng={latest ? Number(latest.longitude) : undefined}
            />
          </View>
        )}

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: isCompleted ? '#2E7D32' : isCancelled ? '#C62828' : theme.colors.primary }]}>
          <StatusIcon size={24} color={isCompleted ? '#2E7D32' : isCancelled ? '#C62828' : theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>
              {statusInfo.title}
            </Text>
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              {statusInfo.subtitle}
            </Text>
          </View>
        </View>

        {/* Route Summary - show when accepted/preparing/en_route */}
        {['ACCEPTED', 'WORKER_PREPARING', 'WORKER_EN_ROUTE'].includes(workerStatus ?? '') && (
          <RouteSummaryCard
            bookingId={bookingId}
            startLat={tracking?.booking?.worker_start_lat}
            startLng={tracking?.booking?.worker_start_lng}
            destinationLat={address?.latitude}
            destinationLng={address?.longitude}
            destinationAddress={[
              address?.line1,
              address?.barangay,
              address?.city,
            ]
              .filter(Boolean)
              .join(', ')}
          />
        )}

        {/* Worker Info */}
        <View style={styles.workerContainer}>
          <View style={styles.workerInfo}>
            <View style={styles.avatarPlaceholder} />
            <View>
              <Text style={theme.typography.h4}>
                {tracking?.booking?.worker_profiles?.display_name ?? 'Assigned Provider'}
              </Text>
              <Text
                style={[
                  theme.typography.body2,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {statusInfo.title}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => {
              const workerAccountId = tracking?.booking?.worker_account_id;
              if (workerAccountId) {
                supabase.from('accounts').select('mobile').eq('id', workerAccountId).single().then(({ data }) => {
                  if (data?.mobile) Linking.openURL(`tel:${data.mobile}`);
                });
              }
            }}>
              <Phone color={theme.colors.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push(`/messages/chat?id=${id}`)}
            >
              <MessageSquare color={theme.colors.primary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Cancellation info */}
        {tracking?.booking?.cancellations?.[0] && (
          <View style={styles.cancellationCard}>
            <Text style={theme.typography.h4}>Cancellation details</Text>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              {tracking.booking.cancellations[0].reason}
            </Text>
            <Text style={theme.typography.body2}>
              Refund: ₱
              {Number(
                tracking.booking.cancellations[0].refund_amount ?? 0,
              ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {/* In-booking Chat */}
        {isActive && (
          <View style={styles.chatSection}>
            <BookingChat
              bookingId={bookingId}
              customerName={tracking?.booking?.worker_profiles?.display_name ?? 'Provider'}
              customerAvatar={tracking?.booking?.worker_profiles?.avatar_path ?? ''}
              onConfirmDetails={() => {}}
              bookingStatus={workerStatus?.toLowerCase()}
            />
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}>
            Booking Progress
          </Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index <= stepIndex;
              const isCurrent = index === stepIndex;
              const isLast = index === TIMELINE_STEPS.length - 1;

              return (
                <View key={step.id} style={styles.timelineItem}>
                  <View style={styles.timelineLineContainer}>
                    {isCompleted ? (
                      <CheckCircle2 color={theme.colors.primary} size={20} />
                    ) : (
                      <Circle color={theme.colors.border} size={20} />
                    )}
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: isCompleted
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineTextContainer}>
                    <Text
                      style={[
                        theme.typography.body1,
                        {
                          fontWeight: isCurrent ? '700' : '500',
                          color: isCurrent
                            ? theme.colors.primary
                            : theme.colors.textPrimary,
                          opacity: isCompleted ? 1 : 0.5,
                        },
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text
                      style={[
                        theme.typography.caption,
                        {
                          color: theme.colors.textSecondary,
                          opacity: isCompleted ? 1 : 0.5,
                        },
                      ]}
                    >
                      {step.subtitle}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isCompleted ? (
          <Button
            title="Confirm Completion & Pay"
            onPress={handleComplete}
            fullWidth
          />
        ) : isCancelled ? (
          <Button
            title="Back to Bookings"
            variant="outlined"
            onPress={() => router.back()}
            fullWidth
          />
        ) : (
          <View style={styles.footerStatus}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
              Your provider will update the status as they work
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1 },
  mapContainer: { height: 250, position: 'relative' },
  workerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  workerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.border,
    marginRight: theme.spacing.md,
  },
  actions: { flexDirection: 'row' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.lg,
  },
  cancellationCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.errorBackground,
  },
  timeline: { paddingBottom: theme.spacing.xxxl },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLineContainer: {
    alignItems: 'center',
    width: 24,
    marginRight: theme.spacing.md,
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineTextContainer: { flex: 1, paddingBottom: theme.spacing.lg },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    ...theme.shadows.sm,
  },
  chatSection: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  timelineSection: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  footer: {
    padding: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
});
