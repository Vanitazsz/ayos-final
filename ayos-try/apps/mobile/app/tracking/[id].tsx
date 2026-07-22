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
} from 'lucide-react-native';
import { fetchBookingTracking, subscribeToTable } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';

const TIMELINE_STEPS = [
  { id: '1', title: 'Provider Hired', subtitle: 'Worker has been selected' },
  { id: '2', title: 'Provider Accepted', subtitle: 'Job has been accepted' },
  { id: '3', title: 'En Route', subtitle: 'Provider is on the way' },
  {
    id: '4',
    title: 'Arrived',
    subtitle: 'Provider has arrived at the location',
  },
  { id: '5', title: 'In Progress', subtitle: 'Service has started' },
  { id: '6', title: 'Completed', subtitle: 'Service finished' },
];

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
    return subscribeToTable(
      'location_updates',
      load,
      `booking_id=eq.${bookingId}`,
    );
  }, [bookingId]);

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
          Live Tracking
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Map Area */}
        <View style={styles.mapContainer}>
          {address?.latitude != null && address?.longitude != null ? (
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
          ) : (
            <View style={styles.mapWithStatus}>
              <Text>Location is not yet available.</Text>
            </View>
          )}
        </View>

        {['ACCEPTED', 'WORKER_PREPARING'].includes(workerStatus ?? '') && (
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
                {tracking?.booking?.worker_profiles?.display_name ?? ''}
              </Text>
              <Text
                style={[
                  theme.typography.body2,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {workerStatus?.replaceAll('_', ' ') ?? 'Loading status'}
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

        {/* Timeline */}
        <ScrollView
          style={styles.timelineScroll}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[theme.typography.h3, { marginBottom: theme.spacing.md }]}
          >
            Status
          </Text>
          <View style={styles.timeline}>
            {(tracking?.booking?.booking_status_events?.length
              ? [...tracking.booking.booking_status_events]
                  .sort(
                    (a: any, b: any) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime(),
                  )
                  .map((event: any, index: number) => ({
                    id: event.id,
                    title: String(event.to_status).replaceAll('_', ' '),
                    subtitle: `${new Date(event.created_at).toLocaleString()}${event.reason ? ` · ${event.reason}` : ''}`,
                    eventIndex: index,
                  }))
              : TIMELINE_STEPS
            ).map((step: any, index: number) => {
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
                        theme.typography.h4,
                        {
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
                        theme.typography.body2,
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
        </ScrollView>
      </View>

      {workerStatus === 'COMPLETED' && (
        <View style={styles.footer}>
          <Button
            title="Confirm Completion"
            onPress={handleComplete}
            fullWidth
          />
        </View>
      )}
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
  mapWithStatus: {
    flex: 1,
    backgroundColor: theme.colors.infoBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: { opacity: 0.5 },
  etaBadge: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    ...theme.shadows.md,
  },
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
  timelineScroll: { flex: 1, padding: theme.spacing.lg },
  timeline: { paddingBottom: theme.spacing.xxxl },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLineContainer: {
    alignItems: 'center',
    width: 24,
    marginRight: theme.spacing.md,
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineTextContainer: { flex: 1, paddingBottom: theme.spacing.lg },
  footer: {
    padding: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
});
