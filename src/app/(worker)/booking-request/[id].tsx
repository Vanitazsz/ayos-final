import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import {
  ArrowLeft,
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

import { Screen } from '@/components/layout/Screen';
import { theme, Colors, Radius, Spacing, Elevation, Layout, AvatarSize } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { ThreeDotMenu } from '@/components/ThreeDotMenu';
import { BookingStepIndicator } from '@/components/booking/BookingStepIndicator';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { CompletedSummary } from '@/components/booking/CompletedSummary';
import { CompleteJobModal } from '@/components/booking/CompleteJobModal';
import * as Location from 'expo-location';
import {
  acceptJob,
  arriveAtJob,
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
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { resolveWorkerEarningsAmount } from '@/utils/bookingPayment';
import type { WorkerBooking } from '@/services/api';
import { showAlert } from '@/components/AppAlert';
import { getRequestMediaSignedUrl } from '@/services/requestMediaCache';

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
  const goBack = useCallback(() => router.replace('/(worker)/bookings'), [router]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [paymentStatus, setPaymentStatus] = useState('UNCONFIRMED');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [commissionRatePercent, setCommissionRatePercent] = useState<number | null>(null);
  const [commissionAmount, setCommissionAmount] = useState<number | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [locationPublisherError, setLocationPublisherError] = useState<string | null>(null);
  const [jobImageUrl, setJobImageUrl] = useState<string | null>(null);

  const setStoreStatus = useWorkerBookingStore((s) => s.setStatus);
  const { liveLocation, tracking, trackingIsLoading } = useBookingTracking(booking.id);
  const bookingRow = tracking?.booking;

  useEffect(() => {
    if (!id) return;
    const load = () => {
      setJobImageUrl(null);
      void fetchBookingDetail(id)
        .then((result) => {
          setIsLoading(false);
          if (result.error) {
            console.error('[booking-detail] fetchBookingDetail failed:', result.error);
            return;
          }
          const row = result.data;
          if (!row?.id) return;
          const request = row.service_requests;
          const payment = Array.isArray(row.payments) ? row.payments[0] : row.payments;
          setPaymentStatus(payment?.status ?? 'UNCONFIRMED');
          setPaymentMethod(payment?.method ?? null);
          const storedRate = Number(payment?.commission_rate);
          setCommissionRatePercent(
            Number.isFinite(storedRate) ? (storedRate <= 1 ? storedRate * 100 : storedRate) : null,
          );
          const storedCommission = Number(payment?.commission_amount);
          setCommissionAmount(Number.isFinite(storedCommission) ? storedCommission : null);
          const earningsAmount = resolveWorkerEarningsAmount(row.agreed_service_amount, payment);
          const address = Array.isArray(request?.addresses)
            ? request.addresses[0]
            : request?.addresses;
          const workerProf = Array.isArray(row.worker_profiles)
            ? row.worker_profiles[0]
            : row.worker_profiles;
          const status = viewStatus(row.status);
          if (row.accepted_at && row.completed_at) {
            const minutes = Math.max(
              0,
              Math.round(
                (new Date(row.completed_at).getTime() - new Date(row.accepted_at).getTime()) /
                  60000,
              ),
            );
            setDuration(`${Math.floor(minutes / 60)}h ${minutes % 60}m`);
          }
          setBackendStatus(row.status);
          setRouteDetails({
            startLat: row.worker_start_lat ?? workerProf?.latitude,
            startLng: row.worker_start_lng ?? workerProf?.longitude,
            destinationLat: address?.latitude,
            destinationLng: address?.longitude,
            address: [address?.line1, address?.barangay, address?.city].filter(Boolean).join(', '),
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
            address: [address?.line1, address?.barangay, address?.city].filter(Boolean).join(', '),
            price: earningsAmount == null ? 'Price pending' : `₱${earningsAmount.toLocaleString()}`,
            status,
            distance: '',
            lat: Number(address?.latitude ?? 0),
            lng: Number(address?.longitude ?? 0),
            hourlyRate: earningsAmount ?? 0,
          });
          setJob({
            id: row.id,
            requestId: request?.id,
            service: request?.service_categories?.name ?? '',
            customerName: row.user_profiles?.display_name ?? '',
            customerAvatar: row.user_profiles?.avatar_path ?? '',
            urgency:
              new Date(request?.scheduled_at).getTime() - Date.now() < 86400000
                ? 'urgent'
                : 'normal',
            description: request?.description ?? '',
            location: [address?.line1, address?.barangay, address?.city].filter(Boolean).join(', '),
            imageUrl: null,
          });
          setStoreStatus(row.id, status as any);
          const media = request?.request_media;
          const firstImage = Array.isArray(media) ? media.find((m: any) => m.content_type?.startsWith('image/')) : null;
          if (firstImage?.storage_path) {
            getRequestMediaSignedUrl(firstImage.storage_path).then(setJobImageUrl).catch(() => {});
          } else {
            setJobImageUrl(null);
          }
        })
        .catch((e) => {
          console.error('[booking-detail] load failed:', e);
          setIsLoading(false);
        });
    };
    load();
    let unsub = () => {};
    try {
      unsub = subscribeToTable('bookings', load, `id=eq.${id}`, undefined, ['INSERT', 'UPDATE']);
    } catch (e) {
      console.warn('[booking-detail] realtime subscribe failed:', e);
    }
    return () => {
      unsub();
    };
  }, [id, setStoreStatus]);

  const beginLocationPublisher = useCallback((bookingId: string) => {
    setLocationPublisherError(null);
    void startEnRouteLocationPublisher(bookingId, {
      onState: (state, message) => {
        if (state === 'active' || state === 'starting') {
          setLocationPublisherError(null);
        } else if (message) {
          setLocationPublisherError(message);
        }
      },
      onError: setLocationPublisherError,
    });
  }, []);

  useEffect(() => {
    if (backendStatus === 'WORKER_EN_ROUTE' && booking.id) {
      beginLocationPublisher(booking.id);
      return () => {
        stopEnRouteLocationPublisher();
      };
    }
    setLocationPublisherError(null);
  }, [backendStatus, beginLocationPublisher, booking.id]);

  const handleDecline = async () => {
    try {
      await declineAssignedBooking(booking.id, 'Worker declined the assigned booking');
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
      setBackendStatus('WORKER_EN_ROUTE');
      setBooking((b) => ({ ...b, status: 'en_route' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleConfirmDetails error:', msg, error);
      showAlert('Start En Route failed', msg);
    }
  };

  const proceedWithArrival = async () => {
    try {
      setIsArriving(true);
      stopEnRouteLocationPublisher();
      const current = backendStatus ?? 'WORKER_EN_ROUTE';
      if (current === 'ACCEPTED' || current === 'WORKER_PREPARING') {
        await departForJob(booking.id).catch(() => null);
      }
      if (['ACCEPTED', 'WORKER_PREPARING', 'WORKER_EN_ROUTE'].includes(current)) {
        await arriveAtJob(booking.id).catch(() => null);
      }
      if (['ACCEPTED', 'WORKER_PREPARING', 'WORKER_EN_ROUTE', 'WORKER_ARRIVED'].includes(current)) {
        await startJob(booking.id).catch(() => null);
      }
      await markJobInProgress(booking.id).catch(() => null);

      setBackendStatus('IN_PROGRESS');
      setBooking((b) => ({ ...b, status: 'in_progress' }));
      router.replace('/(worker)/bookings?filter=In%20Progress');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('proceedWithArrival error:', msg, error);
      showAlert('Arrived failed', msg);
    } finally {
      setIsArriving(false);
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
        if (proximity.error || !proximity.data) {
          showAlert(
            'Arrival denied',
            proximity.error || 'The server could not validate your arrival location.',
            [
              {
                text: 'Continue Anyways',
                onPress: () => {
                  void proceedWithArrival();
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return;
        }
        withinProximity = proximity.data.within_proximity === true;
        if (!proximity.data.within_proximity) {
          showAlert(
            'Outside Arrival Radius',
            proximity.data.message ||
              `You are ${proximity.data.distance_meters}m away. Please get within 50 meters of the destination.`,
            [
              {
                text: 'Continue Anyways',
                onPress: () => {
                  void proceedWithArrival();
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return;
        }
      } else {
        showAlert(
          'Location required',
          'Your current location could not be read. Enable location access and retry before confirming arrival.',
          [
            {
              text: 'Continue Anyways',
              onPress: () => {
                void proceedWithArrival();
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }
      stopEnRouteLocationPublisher();
      if (!locationWasAvailable || !withinProximity) return;
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

  const handleComplete = () => {
    setShowCompleteModal(true);
  };

  const handleJobCompleted = () => {
    setShowCompleteModal(false);
    setBackendStatus('PENDING_CONFIRMATION');
    setBooking((b) => ({ ...b, status: 'pending_review' }));
  };

  const handleConfirmCash = async (method: 'CASH' | 'ONLINE_SIMULATED' = 'CASH') => {
    try {
      if (method === 'CASH') {
        try {
          await confirmCashPayment(booking.id);
        } catch (e) {
          console.warn('confirmCashPayment non-fatal note:', e);
        }
      }
      await confirmPaymentWithCommission(booking.id, method);
      setPaymentStatus('SUCCESSFUL');
      showAlert(
        'Payment & Commission Recorded',
        `Payment method: ${method === 'ONLINE_SIMULATED' ? 'Online Payment (Simulated)' : 'Cash'}\n` +
          'The server-calculated platform commission deduction has been successfully applied to your wallet.',
      );
    } catch (error: any) {
      const message =
        error?.message ||
        error?.details ||
        (error instanceof Error ? error.message : 'Please try again.');
      showAlert('Confirmation failed', message);
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
              showAlert('Report submitted', 'The support team can now review this booking.'),
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
    <Screen
      safeArea
      backgroundColor={Colors.background}
      style={{ paddingBottom: 0 }}
      keyboardAvoiding={false}
    >
      <View style={styles.wideColumn}>
        {trackingIsLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={32} color={Colors.cta} style={styles.spinner} />
            <AppText variant="body" color={Colors.textSecondary} style={{ marginTop: 12 }}>
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
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={goBack}
                hitSlop={12}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={Colors.textPrimary} />
              </Pressable>
              <AppText variant="h3" weight="bold">
                Booking Request
              </AppText>
              <View style={styles.headerSpacer} />
            </View>

            {/* ─── Job Card ─── */}
            <View style={styles.jobCard}>
              <BookingStepIndicator currentStatus={booking.status} />

              <View style={styles.statusBadgeRow}>
                <Badge
                  label={statusConfig[booking.status]?.label || booking.status}
                  variant={(statusConfig[booking.status]?.variant as any) || 'info'}
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
                <ThreeDotMenu onReportUser={handleReport} onCancelService={handleCancelService} />
              </View>

              <AppText variant="caption" color={Colors.textTertiary}>
                Booking #{booking.id.padStart(4, '0')}
              </AppText>

              {job.urgency === 'urgent' && (
                <Badge
                  label="URGENT"
                  variant="error"
                  size="md"
                  icon={null}
                  style={{ alignSelf: 'flex-start' }}
                />
              )}

              {jobImageUrl ? (
                <Image source={{ uri: jobImageUrl }} style={styles.jobImage} resizeMode="cover" />
              ) : null}

              <AppText variant="body" color={Colors.textSecondary} style={styles.description}>
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
              routeDetails.destinationLng != null &&
              (() => {
                const destLat = Number(routeDetails.destinationLat);
                const destLng = Number(routeDetails.destinationLng);
                const fallbackWorkerLat = destLat + 0.012;
                const fallbackWorkerLng = destLng + 0.012;
                const latestUpdate = tracking?.updates?.[0];
                const workerProf = Array.isArray(tracking?.booking?.worker_profiles)
                  ? tracking.booking.worker_profiles[0]
                  : tracking?.booking?.worker_profiles;

                const workerStartLat =
                  routeDetails.startLat != null
                    ? Number(routeDetails.startLat)
                    : workerProf?.latitude != null
                      ? Number(workerProf.latitude)
                      : fallbackWorkerLat;

                const workerStartLng =
                  routeDetails.startLng != null
                    ? Number(routeDetails.startLng)
                    : workerProf?.longitude != null
                      ? Number(workerProf.longitude)
                      : fallbackWorkerLng;

                const isArrivedOrLater = [
                  'WORKER_ARRIVED',
                  'SERVICE_STARTED',
                  'IN_PROGRESS',
                  'PENDING_CONFIRMATION',
                  'COMPLETED',
                ].includes(backendStatus ?? '');

                const isEnRoute = backendStatus === 'WORKER_EN_ROUTE';

                const workerCurrentLat = isArrivedOrLater
                  ? latestUpdate
                    ? Number(latestUpdate.latitude)
                    : workerStartLat
                  : isEnRoute && liveLocation?.latitude != null
                    ? Number(liveLocation.latitude)
                    : latestUpdate
                      ? Number(latestUpdate.latitude)
                      : workerStartLat;

                const workerCurrentLng = isArrivedOrLater
                  ? latestUpdate
                    ? Number(latestUpdate.longitude)
                    : workerStartLng
                  : isEnRoute && liveLocation?.longitude != null
                    ? Number(liveLocation.longitude)
                    : latestUpdate
                      ? Number(latestUpdate.longitude)
                      : workerStartLng;

                return (
                  <View style={{ gap: 12 }}>
                    <BookingMap
                      bookingId={booking.id}
                      startLat={workerStartLat}
                      startLng={workerStartLng}
                      destinationLat={destLat}
                      destinationLng={destLng}
                      destinationAddress={routeDetails.address}
                      workerLat={workerCurrentLat}
                      workerLng={workerCurrentLng}
                    />
                    <RouteSummaryCard
                      bookingId={booking.id}
                      startLat={workerStartLat}
                      startLng={workerStartLng}
                      destinationLat={destLat}
                      destinationLng={destLng}
                      destinationAddress={routeDetails.address}
                      workerView
                    />
                  </View>
                );
              })()}

            {/* ─── State-Specific Content ─── */}
            {booking.status === 'hired' && (
              <View style={styles.hiredBanner}>
                <View style={styles.hiredIconRow}>
                  <Calendar size={28} color={Colors.cta} />
                </View>
                <AppText variant="h3" weight="bold" style={styles.hiredTitle}>
                  You&apos;ve Been Selected!
                </AppText>
                <AppText variant="body" color={Colors.textSecondary} style={styles.hiredSubtitle}>
                  {job.customerName} has selected you for this job. Accept to start coordinating.
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
                          if (
                            msg.includes('Insufficient wallet balance') ||
                            msg.includes('INSUFFICIENT_WALLET_BALANCE')
                          ) {
                            showAlert('Insufficient Wallet Balance', msg, [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Go to Wallet',
                                onPress: () => router.push('/(worker)/wallet'),
                              },
                            ]);
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
                    onPress={() =>
                      showAlert(
                        'Decline Request',
                        'Are you sure you want to decline this booking?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Decline',
                            style: 'destructive',
                            onPress: handleDecline,
                          },
                        ],
                      )
                    }
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
                  label="Start En Route"
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
                {locationPublisherError && (
                  <View style={styles.locationErrorCard}>
                    <AppText variant="bodySm" weight="semiBold" color={Colors.error}>
                      Route sharing unavailable
                    </AppText>
                    <AppText variant="caption" color={Colors.textSecondary}>
                      {locationPublisherError}
                    </AppText>
                    <AppButton
                      label="Retry Location"
                      variant="outline"
                      size="sm"
                      onPress={() => beginLocationPublisher(booking.id)}
                    />
                  </View>
                )}
                <View style={styles.contactRow}>
                  <Pressable
                    style={styles.contactBtn}
                    onPress={() => router.push(`/messages/chat?id=${booking.id}`)}
                  >
                    <MessageSquare size={18} color={Colors.cta} />
                    <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
                      Message
                    </AppText>
                  </Pressable>
                </View>
                <AppButton
                  label="I've Arrived & Start Job"
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
                    <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
                      Message
                    </AppText>
                  </Pressable>
                </View>
                <AppButton
                  label="Complete Job"
                  variant="primary"
                  leftIcon={<CheckCircle2 size={18} color={Colors.white} />}
                  fullWidth
                  onPress={handleComplete}
                />
              </View>
            )}

            {booking.status === 'pending_review' && (
              <View style={styles.reviewCard}>
                <Loader2 size={36} color={Colors.warning} style={styles.spinner} />
                <AppText variant="h4" weight="bold" style={styles.reviewTitle}>
                  Waiting for Customer
                </AppText>
                <AppText variant="body" color={Colors.textSecondary} style={styles.reviewSubtitle}>
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
                    <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
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
                  paymentMethod={paymentMethod}
                  commissionRatePercent={commissionRatePercent}
                  commissionAmount={commissionAmount}
                  onConfirmCash={handleConfirmCash}
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

      <CompleteJobModal
        visible={showCompleteModal}
        bookingId={booking.id}
        customerName={booking.customerName}
        serviceName={booking.service}
        onClose={() => setShowCompleteModal(false)}
        onCompleted={handleJobCompleted}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wideColumn: {
    flex: 1,
    ...theme.layout.wideColumn,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingVertical: Layout.screenPadding,
    paddingBottom: 88,
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
  locationErrorCard: {
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    gap: Spacing['2'],
    borderWidth: 1,
    borderColor: Colors.error,
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
