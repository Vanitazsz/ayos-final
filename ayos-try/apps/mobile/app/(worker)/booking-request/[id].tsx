import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import {
  ChevronLeft,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Phone,
  MessageSquare,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { BookingChat } from '@/components/booking/BookingChat';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { JobTimer } from '@/components/booking/JobTimer';
import { CompletedSummary } from '@/components/booking/CompletedSummary';
import {
  acceptJob,
  arriveAtJob,
  cancelBooking,
  completeJob,
  createSupportTicket,
  departForJob,
  fetchBookingDetail,
  markJobInProgress,
  prepareJob,
  startJob,
  subscribeToTable,
} from '@/services/api';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import type { WorkerBooking } from '@/services/api';

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
          : status.toLowerCase();

export default function BookingRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [backendStatus, setBackendStatus] = useState('PENDING');
  const [duration, setDuration] = useState('Not recorded');
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setStoreStatus = useWorkerBookingStore((s) => s.setStatus);

  useEffect(() => {
    if (!id) return;
    const load = () =>
      void fetchBookingDetail(id).then((result) => {
        setIsLoading(false);
        if (result.error) {
          console.error('[booking-detail] fetchBookingDetail failed:', result.error);
          return;
        }
        const row = result.data;
        const request = row.service_requests;
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
          price: `₱${Number(request?.budget ?? 0).toLocaleString()}`,
          status,
          distance: '',
          lat: Number(address?.latitude ?? 0),
          lng: Number(address?.longitude ?? 0),
          hourlyRate: Number(request?.budget ?? 0),
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
      });
    load();
    return subscribeToTable('bookings', load, `id=eq.${id}`);
  }, [id, setStoreStatus]);

  const handleDecline = async () => {
    try {
      await cancelBooking(booking.id, 'Worker declined the assigned booking');
      setBackendStatus('CANCELLED');
      setBooking((b) => ({ ...b, status: 'cancelled' }));
      router.replace('/(worker)/bookings?filter=Cancelled');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('Decline error:', msg, error);
      Alert.alert('Decline failed', msg);
    }
  };

  const handleConfirmDetails = async () => {
    try {
      console.log('[handleConfirmDetails] booking.id:', booking.id);
      await departForJob(booking.id);
      setBackendStatus('WORKER_EN_ROUTE');
      setBooking((b) => ({ ...b, status: 'en_route' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleConfirmDetails error:', msg, error);
      Alert.alert('Start En Route failed', msg);
    }
  };

  const handleArrived = async () => {
    try {
      await arriveAtJob(booking.id);
      await startJob(booking.id);
      setBackendStatus('IN_PROGRESS');
      setBooking((b) => ({ ...b, status: 'in_progress' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleArrived error:', msg, error);
      Alert.alert('Arrived failed', msg);
    }
  };

  const handleComplete = async () => {
    try {
      await completeJob(booking.id);
      setBackendStatus('COMPLETED');
      setBooking((b) => ({ ...b, status: 'completed' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleComplete error:', msg, error);
      Alert.alert('Complete failed', msg);
    }
  };

  const handleReport = () => {
    Alert.alert('Report User', 'Submit a conduct report for this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        style: 'destructive',
        onPress: () =>
          void createSupportTicket({
            bookingId: booking.id,
            subject: 'Booking participant conduct report',
            description: `Worker submitted a conduct report for booking ${booking.id}. Administrator review is required.`,
          })
            .then(() =>
              Alert.alert(
                'Report submitted',
                'The support team can now review this booking.',
              ),
            )
            .catch((error) => Alert.alert('Report failed', error.message)),
      },
    ]);
  };

  const handleCall = () =>
    Alert.alert(
      'Phone unavailable',
      'The customer has not shared a callable phone number. Use secure booking messages.',
    );

  const handleCancelService = () => {
    router.push(`/(worker)/cancel-service/${booking.id}`);
  };

  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isActive = !isCompleted && !isCancelled;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
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
        {isActive && routeDetails && routeDetails.destinationLat != null && routeDetails.destinationLng != null && (
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
              {job.customerName} has selected you for this job. Accept to start
              coordinating.
            </AppText>
            <View style={styles.hiredActions}>
              <AppButton
                label="Accept Booking ✅"
                variant="primary"
                leftIcon={<Calendar size={18} color={Colors.white} />}
                fullWidth
                onPress={() =>
                  void acceptJob(booking.id)
                    .then(() => {
                      setBackendStatus('ACCEPTED');
                      setBooking((b) => ({ ...b, status: 'accepted' }));
                    })
                    .catch((error) =>
                      Alert.alert('Unable to accept', error.message),
                    )
                    .catch((err: any) => {
                      const msg = err?.message ?? err?.code ?? String(err);
                      console.error('acceptJob error:', msg, err);
                      Alert.alert('Accept failed', msg);
                    })
                }
              />
              <AppButton
                label="Decline ❌"
                variant="outline"
                fullWidth
                onPress={handleDecline}
              />
            </View>
          </View>
        )}

        {booking.status === 'accepted' && (
          <View style={{ gap: 12 }}>
            <BookingChat
              bookingId={String(id)}
              customerName={job.customerName}
              customerAvatar={job.customerAvatar}
              onConfirmDetails={handleConfirmDetails}
              bookingStatus={booking.status}
            />
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
              <Pressable style={styles.contactBtn} onPress={handleCall}>
                <Phone size={18} color={Colors.cta} />
                <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
                  Call
                </AppText>
              </Pressable>
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
              label="I've Arrived & Start Job 📍"
              variant="primary"
              leftIcon={<MapPin size={18} color={Colors.white} />}
              fullWidth
              onPress={handleArrived}
            />
          </View>
        )}

        {booking.status === 'in_progress' && (
          <View style={{ gap: 12 }}>
            <JobTimer hourlyRate={booking.hourlyRate ?? 0} />
            <View style={styles.contactRow}>
              <Pressable style={styles.contactBtn} onPress={handleCall}>
                <Phone size={18} color={Colors.cta} />
                <AppText variant="bodySm" weight="semiBold" color={Colors.cta}>
                  Call
                </AppText>
              </Pressable>
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
              label="Complete Job ✅"
              variant="primary"
              leftIcon={<CheckCircle2 size={18} color={Colors.white} />}
              fullWidth
              onPress={handleComplete}
            />
          </View>
        )}

        {isCompleted && (
          <CompletedSummary
            bookingId={booking.id}
            duration={duration}
            earnings={booking.price}
          />
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
