import React, { useState, useEffect } from 'react';
import {View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,} from 'react-native';
import {
  ChevronLeft,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import {
  Colors,
  Radius,
  Spacing,
  Elevation,
  Layout,
  AvatarSize,
} from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { ThreeDotMenu } from '@/components/ThreeDotMenu';
import { BookingStepIndicator } from '@/components/booking/BookingStepIndicator';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { CompletedSummary } from '@/components/booking/CompletedSummary';
import * as Location from 'expo-location';
import {
  acceptJob,
  arriveAtJob,
  completeJob,
  confirmCashPayment,
  confirmPaymentWithCommission,
  confirmWorkerArrival,
  declineAssignedBooking,
  departForJob,
  fetchBookingDetail,
  markJobInProgress,
  prepareJob,
  reportBookingParticipant,
  startJob,
  subscribeToTable,
} from '@/services/api';
import {
  startEnRouteLocationPublisher,
  stopEnRouteLocationPublisher,
} from '@/services/liveDispatch';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { resolveWorkerEarningsAmount } from '@/utils/bookingPayment';
import { shouldTransitionToArrivedAfterProximityCheck } from '@/utils/arrivalTransition';
import type { WorkerBooking } from '@/services/api';
import { showAlert } from '@/components/AppAlert';


const statusConfig: Record<string, { label: string; variant: any }> = {
  hired: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  en_route: { label: 'En Route', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
};
const viewStatus = (status: string) =>
  status === 'PENDING'
    ? 'hired'
    : status === 'ACCEPTED' || status === 'WORKER_PREPARING'
      ? 'accepted'
      : status === 'WORKER_EN_ROUTE' || status === 'WORKER_ARRIVED'
        ? 'en_route'
        : status === 'SERVICE_STARTED' || status === 'IN_PROGRESS'
          ? 'in_progress'
          : status === 'PENDING_CONFIRMATION'
          ? 'pending_review'
          : status.toLowerCase();

export default function BookingRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack('/(worker)/bookings');
  const [job, setJob] = useState<any>({
    id,
    service: '',
    customerName: '',
    customerAvatar: '',
    urgency: 'normal',
    description: '',
    location: '',
    imageUrl: null,
  });
  const [booking, setBooking] = useState<WorkerBooking>({
    id: id ?? '',
    customerName: '',
    customerAvatar: '',
    service: '',
    date: '',
    time: '',
    address: '',
    price: '',
    status: 'hired',
    distance: '',
    lat: 0,
    lng: 0,
    hourlyRate: 0,
  });
  const [isArriving, setIsArriving] = useState(false);
  const [backendStatus, setBackendStatus] = useState('PENDING');
  const [duration, setDuration] = useState('Not recorded');
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('UNCONFIRMED');

  const setStoreStatus = useWorkerBookingStore((s) => s.setStatus);

  useEffect(() => {
    if (!id) return;
    const load = () =>
      void fetchBookingDetail(id)
        .then((result) => {
          setIsLoading(false);
          if (result.error) {
            console.error(
              '[booking-detail] fetchBookingDetail failed:',
              result.error,
            );
            return;
          }
          const row = result.data;
          if (!row?.id) return;
          const request = row.service_requests;
          const payment = Array.isArray(row.payments)
            ? row.payments[0]
            : row.payments;
          setPaymentStatus(payment?.status ?? 'UNCONFIRMED');
          const earningsAmount = resolveWorkerEarningsAmount(
            row.agreed_service_amount,
            payment,
          );
          const address = request?.addresses;
          const status = viewStatus(row.status);
          if (row.accepted_at && row.completed_at) {
            const minutes = Math.max(
              0,
              Math.round(
                (new Date(row.completed_at).getTime() -
                  new Date(row.accepted_at).getTime()) /
                  60000,
              ),
            );
            setDuration(`${Math.floor(minutes / 60)}h ${minutes % 60}m`);
          }
          setBackendStatus(row.status);
          setRouteDetails({
            startLat: row.worker_start_lat,
            startLng: row.worker_start_lng,
            destinationLat: address?.latitude,
            destinationLng: address?.longitude,
            address: [address?.line1, address?.barangay, address?.city]
              .filter(Boolean)
              .join(', '),
          });
          setBooking({
            id: row.id,
            customerName: row.user_profiles?.display_name ?? '',
            customerAvatar: row.user_profiles?.avatar_path ?? '',
            service: request?.service_categories?.name ?? '',
            date: new Date(request?.scheduled_at).toLocaleDateString(),
            time: new Date(request?.scheduled_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            address: [address?.line1, address?.barangay, address?.city]
              .filter(Boolean)
              .join(', '),
            price:
              earningsAmount == null
                ? 'Price pending'
                : `₱${earningsAmount.toLocaleString()}`,
            status,
            distance: '',
            lat: Number(address?.latitude ?? 0),
            lng: Number(address?.longitude ?? 0),
            hourlyRate: earningsAmount ?? 0,
          });
          setJob({
            id: request?.id,
            service: request?.service_categories?.name ?? '',
            customerName: row.user_profiles?.display_name ?? '',
            customerAvatar: row.user_profiles?.avatar_path ?? '',
            urgency:
              new Date(request?.scheduled_at).getTime() - Date.now() < 86400000
                ? 'urgent'
                : 'normal',
            description: request?.description ?? '',
            location: [address?.line1, address?.barangay, address?.city]
              .filter(Boolean)
              .join(', '),
            imageUrl: null,
          });
          setStoreStatus(row.id, status as any);
        })
        .catch((e) => {
          console.error('[booking-detail] load failed:', e);
          setIsLoading(false);
        });
    load();
    let unsub = () => {};
    try {
      unsub = subscribeToTable('bookings', load, `id=eq.${id}`, undefined, ['INSERT', 'UPDATE']);
    } catch (e) {
      console.warn('[booking-detail] realtime subscribe failed:', e);
    }
    return unsub;
  }, [id, setStoreStatus]);

  useEffect(() => {
    if (backendStatus === 'WORKER_EN_ROUTE' && booking.id) {
      void startEnRouteLocationPublisher(booking.id);
      return () => {
        stopEnRouteLocationPublisher();
      };
    }
  }, [backendStatus, booking.id]);

  const handleDecline = async () => {
    try {
      await declineAssignedBooking(
        booking.id,
        'Worker declined the assigned booking',
      );
      setBackendStatus('CANCELLED');
      setBooking((b) => ({ ...b, status: 'cancelled' }));
      router.replace('/(worker)/bookings?filter=Cancelled');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('Decline error:', msg, error);
      showAlert('Decline failed', msg);
    }
  };

  const handleConfirmDetails = async () => {
    try {
      console.log('[handleConfirmDetails] booking.id:', booking.id);
      await prepareJob(booking.id);
      await departForJob(booking.id);
      void startEnRouteLocationPublisher(booking.id);
      setBackendStatus('WORKER_EN_ROUTE');
      setBooking((b) => ({ ...b, status: 'en_route' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleConfirmDetails error:', msg, error);
      showAlert('Start En Route failed', msg);
    }
  };

  const handleArrived = async () => {
    if (isArriving) return;
    setIsArriving(true);
    try {
      let locationWasAvailable = false;
      let withinProximity = false;
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (loc) {
        locationWasAvailable = true;
        const proximity = await confirmWorkerArrival(
          booking.id,
          loc.coords.latitude,
          loc.coords.longitude,
        );
        if (!proximity.error) {
          withinProximity = proximity.data?.within_proximity === true;
        }
        if (
          !proximity.error &&
          proximity.data &&
          !proximity.data.within_proximity
        ) {
          showAlert(
            'Outside Arrival Radius',
            proximity.data.message ||
              `You are ${proximity.data.distance_meters}m away. Please get within 50 meters of the customer address.`,
          );
          return;
        }
      }
      stopEnRouteLocationPublisher();
      if (shouldTransitionToArrivedAfterProximityCheck(locationWasAvailable, withinProximity)) {
        await arriveAtJob(booking.id);
      }
      await startJob(booking.id);
      await markJobInProgress(booking.id);
      setBackendStatus('IN_PROGRESS');
      setBooking((b) => ({ ...b, status: 'in_progress' }));
      router.replace('/(worker)/bookings?filter=In%20Progress');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleArrived error:', msg, error);
      showAlert('Arrived failed', msg);
    } finally {
      setIsArriving(false);
    }
  };


  const handleComplete = async () => {
    try {
      await completeJob(booking.id);
      setBackendStatus('PENDING_CONFIRMATION');
      setBooking((b) => ({ ...b, status: 'pending_review' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleComplete error:', msg, error);
      showAlert('Complete failed', msg);
    }
  };

  const handleLeaveFeedback = () => {
    if (booking?.id) {
      router.push(`/(worker)/leave-feedback/${booking.id}`);
    }
  };

  const handleConfirmCash = async (method: 'CASH' | 'ONLINE_SIMULATED' = 'CASH') => {
    try {
      const payment = await confirmPaymentWithCommission(booking.id, method);
      setPaymentStatus('SUCCESSFUL');
      showAlert(
        'Payment & Commission Recorded',
        `Payment method: ${method === 'ONLINE_SIMULATED' ? 'Online Payment (Simulated)' : 'Cash'}\n` +
        `10% platform commission deduction has been successfully applied to your wallet.`,
      );
    } catch (error) {
      showAlert(
        'Confirmation failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const handleReport = () => {
    showAlert('Report User', 'Submit a conduct report for this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        style: 'destructive',
        onPress: () =>
          void reportBookingParticipant(
            booking.id,
            `Worker submitted a conduct concern for booking ${booking.id}. Administrator review is required.`,
          )
            .then(() =>
              showAlert(
                'Report submitted',
                'The support team can now review this booking.',
              ),
            )
            .catch((error) => showAlert('Report failed', error.message)),
      },
    ]);
  };

  const handleCancelService = () => {
    router.push(`/(worker)/cancel-service/${booking.id}`);
  };

  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isActive = !isCompleted && !isCancelled;

  const remainingTime = '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={goBack}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h4" weight="bold" color={Colors.textPrimary}>
          Booking Request
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Loader2 size={32} color={Colors.cta} style={styles.spinner} />
          <AppText
            variant="body"
            color={Colors.textSecondary}
            style={{ marginTop: 12 }}
          >
            Loading booking...
          </AppText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Job Card ─── */}
          <View style={styles.jobCard}>
            <BookingStepIndicator currentStatus={booking.status} />

            <View style={styles.statusBadgeRow}>
              <Badge
                label={statusConfig[booking.status]?.label || booking.status}
                variant={
                  (statusConfig[booking.status]?.variant as any) || 'info'
                }
                size="md"
              />
              {booking.status === 'in_progress' && (
                <Badge label="Currently Working" variant="warning" size="md" />
              )}
            </View>

            <View style={styles.cardTopRow}>
              <AppText variant="h3" weight="bold" style={{ flex: 1 }}>
                {job.service}
              </AppText>
              <ThreeDotMenu
                onReportUser={handleReport}
                onCancelService={handleCancelService}
              />
            </View>

            <AppText variant="caption" color={Colors.textTertiary}>
              Booking #{booking.id.padStart(4, '0')}
            </AppText>

            {job.urgency === 'urgent' && (
              <Badge label="URGENT" variant="error" size="md" />
            )}

            {job.imageUrl && (
              <Image
                source={{ uri: job.imageUrl }}
                style={styles.jobImage}
                resizeMode="cover"
              />
            )}

            <AppText
              variant="body"
              color={Colors.textSecondary}
              style={styles.description}
            >
              &ldquo;{job.description}&rdquo;
            </AppText>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <AppText variant="label" color={Colors.textTertiary}>
                Client
              </AppText>
              <AppText variant="body" weight="semiBold">
                {job.customerName}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MapPin size={14} color={Colors.textTertiary} />
                <AppText variant="label" color={Colors.textTertiary}>
                  Location
                </AppText>
              </View>
              <AppText variant="body" weight="semiBold">
                {job.location}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Clock size={14} color={Colors.textTertiary} />
                <AppText variant="label" color={Colors.textTertiary}>
                  Schedule
                </AppText>
              </View>
              <AppText variant="body" weight="semiBold">
                {booking.date} · {booking.time}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <DollarSign size={14} color={Colors.textTertiary} />
                <AppText variant="label" color={Colors.textTertiary}>
                  Est. Earnings
                </AppText>
              </View>
              <AppText variant="body" weight="semiBold" color={Colors.cta}>
                {booking.price}
              </AppText>
            </View>
          </View>

          {/* ─── Client Card ─── */}
          <View style={styles.clientCard}>
            <View style={styles.clientHeader}>
              <Avatar uri={job.customerAvatar} size={AvatarSize.medium} />
              <View style={styles.clientInfo}>
                <AppText variant="body" weight="semiBold">
                  {job.customerName}
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Booking customer
                </AppText>
              </View>
            </View>
            <Badge label="Good client" variant="success" size="sm" />
          </View>

          {/* ─── Map & Route (all active states) ─── */}
          {isActive &&
            routeDetails &&
            routeDetails.destinationLat != null &&
            routeDetails.destinationLng != null && (
              <View style={{ gap: 12 }}>
                <BookingMap
                  bookingId={booking.id}
                  startLat={routeDetails.startLat}
                  startLng={routeDetails.startLng}
                  destinationLat={routeDetails.destinationLat}
                  destinationLng={routeDetails.destinationLng}
                  destinationAddress={routeDetails.address}
                />
                <RouteSummaryCard
                  bookingId={booking.id}
                  startLat={routeDetails.startLat}
                  startLng={routeDetails.startLng}
                  destinationLat={routeDetails.destinationLat}
                  destinationLng={routeDetails.destinationLng}
                  destinationAddress={routeDetails.address}
                  workerView
                />
              </View>
            )}

          {/* ─── State-Specific Content ─── */}
          {booking.status === 'hired' && (
            <View style={styles.hiredBanner}>
              <View style={styles.hiredIconRow}>
                <Calendar size={28} color={Colors.cta} />
              </View>
              <AppText variant="h3" weight="bold" style={styles.hiredTitle}>
                You&apos;ve Been Selected!
              </AppText>
              <AppText
                variant="body"
                color={Colors.textSecondary}
                style={styles.hiredSubtitle}
              >
                {job.customerName} has selected you for this job. Accept to
                start coordinating.
              </AppText>
              <View style={styles.hiredActions}>
                <AppButton
                  label="Accept Booking"
                  variant="primary"
                  leftIcon={<Calendar size={18} color={Colors.white} />}
                  fullWidth
                  onPress={() =>
                    void acceptJob(booking.id)
                      .then(() => {
                        setBackendStatus('ACCEPTED');
                        setBooking((b) => ({ ...b, status: 'accepted' }));
                      })
                      .catch((err: any) => {
                        const msg = err?.message ?? err?.code ?? String(err);
                        if (msg.includes('Insufficient wallet balance') || msg.includes('INSUFFICIENT_WALLET_BALANCE')) {
                          showAlert(
                            'Insufficient Wallet Balance',
                            msg,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Go to Wallet',
                                onPress: () => router.push('/(worker)/wallet'),
                              },
                            ],
                          );
                        } else {
                          showAlert('Accept failed', msg);
                        }
                      })
                  }
                />
                <AppButton
                  label="Decline"
                  variant="outline"
                  fullWidth
                  onPress={handleDecline}
                  labelStyle={{ color: Colors.error }}
                  style={{ borderColor: Colors.error }}
                  pressedStyle={{ backgroundColor: Colors.errorBg }}
                />
              </View>
            </View>
          )}

          {booking.status === 'accepted' && (
            <View style={{ gap: 12 }}>
              <AppButton
                label="Start En Route 🚚"
                variant="primary"
                fullWidth
                onPress={handleConfirmDetails}
              />
              <Pressable
                style={styles.contactNowBtn}
                onPress={() => router.push(`/messages/chat?id=${booking.id}`)}
              >
                <MessageSquare size={16} color={Colors.cta} />
                <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
                  Open Full Chat
                </AppText>
              </Pressable>
            </View>
          )}

          {booking.status === 'en_route' && (
            <View style={{ gap: 12 }}>
              <View style={styles.contactRow}>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => router.push(`/messages/chat?id=${booking.id}`)}
                >
                  <MessageSquare size={18} color={Colors.cta} />
                  <AppText
                    variant="bodySm"
                    weight="semiBold"
                    color={Colors.cta}
                  >
                    Message
                  </AppText>
                </Pressable>
              </View>
              <AppButton
                label="I've Arrived & Start Job 📍"
                variant="primary"
                leftIcon={<MapPin size={18} color={Colors.white} />}
                fullWidth
                loading={isArriving}
                disabled={isArriving}
                onPress={handleArrived}
              />
            </View>
          )}

          {booking.status === 'in_progress' && (
            <View style={{ gap: 12 }}>
              <View style={styles.contactRow}>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => router.push(`/messages/chat?id=${booking.id}`)}
                >
                  <MessageSquare size={18} color={Colors.cta} />
                  <AppText
                    variant="bodySm"
                    weight="semiBold"
                    color={Colors.cta}
                  >
                    Message
                  </AppText>
                </Pressable>
              </View>
              <AppButton
                label="Complete Job ✅"
                variant="primary"
                leftIcon={<CheckCircle2 size={18} color={Colors.white} />}
                fullWidth
                onPress={handleComplete}
              />
            </View>
          )}

          {booking.status === 'pending_review' && (
            <View style={styles.reviewCard}>
              <Loader2
                size={36}
                color={Colors.warning}
                style={styles.spinner}
              />
              <AppText variant="h4" weight="bold" style={styles.reviewTitle}>
                Waiting for Customer
              </AppText>
              <AppText
                variant="body"
                color={Colors.textSecondary}
                style={styles.reviewSubtitle}
              >
                The customer has been notified to confirm the job completion.
              </AppText>
              {remainingTime && (
                <View style={styles.timeoutBadge}>
                  <Clock size={14} color={Colors.textTertiary} />
                  <AppText variant="caption" color={Colors.textSecondary}>
                    Auto-confirms in {remainingTime}
                  </AppText>
                </View>
              )}
              <View style={styles.contactRow}>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => router.push(`/messages/chat?id=${booking.id}`)}
                >
                  <MessageSquare size={18} color={Colors.cta} />
                  <AppText
                    variant="bodySm"
                    weight="semiBold"
                    color={Colors.cta}
                  >
                    Message
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}

          {isCompleted && (
            <View style={{ gap: 12 }}>
              <CompletedSummary
                bookingId={booking.id}
                duration={duration}
                earnings={booking.price}
                paymentStatus={paymentStatus}
                onConfirmCash={handleConfirmCash}
                onLeaveFeedback={handleLeaveFeedback}
              />
            </View>
          )}

          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <XCircle size={36} color={Colors.error} />
              <AppText variant="h4" weight="bold" color={Colors.error}>
                Booking Cancelled
              </AppText>
              <AppText
                variant="body"
                color={Colors.textSecondary}
                style={{ textAlign: 'center' }}
              >
                This booking has been cancelled.
              </AppText>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing['16'],
    paddingBottom: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing['10'],
    gap: Spacing['4'],
  },
  jobCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Layout.cardPadding,
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobImage: { width: '100%', height: 180, borderRadius: Radius.lg },
  description: { fontStyle: 'italic' },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing['1'],
  },
  detailRow: { gap: Spacing['1'] },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  clientCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Layout.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Elevation.sm,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  clientInfo: { gap: Spacing['1'] },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
    marginBottom: Spacing['2'],
  },

  // Hired
  hiredBanner: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  hiredIconRow: { marginBottom: Spacing['1'] },
  hiredTitle: { textAlign: 'center' },
  hiredSubtitle: { textAlign: 'center' },
  hiredActions: { width: '100%', gap: Spacing['2'], marginTop: Spacing['2'] },

  // En Route
  contactRow: { flexDirection: 'row', gap: Spacing['3'] },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['3'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Elevation.sm,
  },

  // Accepted chat
  contactNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['2'],
  },

  // Pending review
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['3'],
    ...Elevation.sm,
  },
  spinner: { marginBottom: Spacing['1'] },
  reviewTitle: { textAlign: 'center' },
  reviewSubtitle: { textAlign: 'center' },
  timeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['1'],
    borderRadius: Radius.full,
  },

  // Cancelled
  cancelledBanner: {
    alignItems: 'center',
    gap: Spacing['2'],
    padding: Spacing['6'],
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    ...Elevation.sm,
  },
});
