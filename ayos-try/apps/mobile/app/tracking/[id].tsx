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
import {
  fetchBookingTracking,
  subscribeToTable,
  acceptJob,
  departForJob,
  arriveAtJob,
  startJob,
  markJobInProgress,
  completeJob,
} from '@/services/api';
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
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
    return () => {
      stopLocation();
      stopBooking();
    };
  }, [bookingId]);

  const stepIndex = useMemo(() => {
    return workerStatus && STATUS_STEP_MAP[workerStatus] !== undefined
      ? STATUS_STEP_MAP[workerStatus]
      : 0;
  }, [workerStatus]);

  const handleComplete = () => {
    router.push(`/payment/${id}`);
  };

  const advanceToStatus = async (targetStatus: string) => {
    if (!bookingId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      if (targetStatus === 'ACCEPTED') {
        await acceptJob(bookingId);
      } else if (targetStatus === 'WORKER_EN_ROUTE') {
        try { await acceptJob(bookingId); } catch {}
        await departForJob(bookingId);
      } else if (targetStatus === 'IN_PROGRESS') {
        try { await acceptJob(bookingId); } catch {}
        try { await departForJob(bookingId); } catch {}
        try { await arriveAtJob(bookingId); } catch {}
        try { await startJob(bookingId); } catch {}
        await markJobInProgress(bookingId);
      } else if (targetStatus === 'COMPLETED') {
        try { await acceptJob(bookingId); } catch {}
        try { await departForJob(bookingId); } catch {}
        try { await arriveAtJob(bookingId); } catch {}
        try { await startJob(bookingId); } catch {}
        try { await markJobInProgress(bookingId); } catch {}
        await completeJob(bookingId);
      }
    } catch (e) {
      console.warn('Status transition attempt:', e);
    } finally {
      await fetchBookingTracking(bookingId).then(setTracking);
      setUpdatingStatus(false);
    }
  };

  const bypassToPayment = async () => {
    if (!bookingId) return;
    if (workerStatus !== 'COMPLETED') {
      await advanceToStatus('COMPLETED');
    }
    router.push(`/payment/${id}`);
  };

  const bypassToReview = async () => {
    if (!bookingId) return;
    router.push(`/review/${id}`);
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
          {/* PoC Demo Controls Card */}
          <View style={styles.pocCard}>
            <View style={styles.pocHeader}>
              <Text style={[theme.typography.h4, { color: '#1e293b' }]}>
                ⚡ PoC Simulation & Bypass Controls
              </Text>
              <Text style={[theme.typography.caption, { color: '#64748b' }]}>
                Bypass pending state & test status transitions in real time:
              </Text>
            </View>
            <View style={styles.pocButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.pocBtn,
                  ['ACCEPTED', 'WORKER_PREPARING'].includes(workerStatus ?? '') &&
                    styles.pocBtnActive,
                ]}
                onPress={() => advanceToStatus('ACCEPTED')}
                disabled={updatingStatus}
              >
                <Text style={styles.pocBtnText}>1. Accept Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pocBtn,
                  workerStatus === 'WORKER_EN_ROUTE' && styles.pocBtnActive,
                ]}
                onPress={() => advanceToStatus('WORKER_EN_ROUTE')}
                disabled={updatingStatus}
              >
                <Text style={styles.pocBtnText}>2. En Route</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pocBtn,
                  ['SERVICE_STARTED', 'IN_PROGRESS'].includes(
                    workerStatus ?? '',
                  ) && styles.pocBtnActive,
                ]}
                onPress={() => advanceToStatus('IN_PROGRESS')}
                disabled={updatingStatus}
              >
                <Text style={styles.pocBtnText}>3. Start Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pocBtn,
                  workerStatus === 'COMPLETED' && styles.pocBtnActive,
                ]}
                onPress={() => advanceToStatus('COMPLETED')}
                disabled={updatingStatus}
              >
                <Text style={styles.pocBtnText}>4. Complete</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pocActionRow}>
              <TouchableOpacity
                style={styles.pocPrimaryBtn}
                onPress={bypassToPayment}
              >
                <Text style={styles.pocPrimaryBtnText}>
                  💳 Straight to Payment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pocOutlineBtn}
                onPress={bypassToReview}
              >
                <Text style={styles.pocOutlineBtnText}>
                  ⭐ Straight to Review
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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

      <View style={styles.footer}>
        {workerStatus === 'COMPLETED' ? (
          <Button
            title="Confirm Completion & Pay 💳"
            onPress={handleComplete}
            fullWidth
          />
        ) : (
          <Button
            title="Bypass & Proceed to Payment 💳"
            variant="outlined"
            onPress={bypassToPayment}
            fullWidth
          />
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
  pocCard: {
    backgroundColor: '#f8fafc',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pocHeader: {
    marginBottom: theme.spacing.sm,
  },
  pocButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  pocBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pocBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  pocBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  pocActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  pocPrimaryBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  pocPrimaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  pocOutlineBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  pocOutlineBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 12,
  },
});
