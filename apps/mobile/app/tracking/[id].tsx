import React, { useMemo } from 'react';
import {View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Wrench,
} from 'lucide-react-native';
import { buildProviderReportEmail } from '@/services/support';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { styles } from './_tracking.styles';
import { useBookingTracking } from '@/hooks/useBookingTracking';


const STATUS_STEP_MAP: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  WORKER_PREPARING: 1,
  WORKER_EN_ROUTE: 2,
  WORKER_ARRIVED: 3,
  SERVICE_STARTED: 4,
  IN_PROGRESS: 4,
  PENDING_CONFIRMATION: 4,
  COMPLETED: 5,
};

const STATUS_INFO: Record<
  string,
  { title: string; subtitle: string; icon: any }
> = {
  PENDING: {
    title: 'Waiting for Provider',
    subtitle: 'Your booking has been sent. A provider will accept shortly.',
    icon: Clock,
  },
  ACCEPTED: {
    title: 'Provider Accepted',
    subtitle: 'Your provider has accepted the job and is getting ready.',
    icon: CheckCircle2,
  },
  WORKER_PREPARING: {
    title: 'Provider Preparing',
    subtitle: 'Your provider is preparing to head to your location.',
    icon: Clock,
  },
  WORKER_EN_ROUTE: {
    title: 'Provider On The Way',
    subtitle: 'Your provider is en route to your location.',
    icon: MapPin,
  },
  WORKER_ARRIVED: {
    title: 'Provider Has Arrived',
    subtitle: 'Your provider has arrived at your location.',
    icon: MapPin,
  },
  SERVICE_STARTED: {
    title: 'Service In Progress',
    subtitle: 'Work has begun on your service request.',
    icon: Wrench,
  },
  IN_PROGRESS: {
    title: 'Service In Progress',
    subtitle: 'Work is currently being done.',
    icon: Wrench,
  },
  PENDING_CONFIRMATION: {
    title: 'Confirm Job Completion',
    subtitle: 'Your provider marked the job complete. Please confirm the work.',
    icon: Clock,
  },
  COMPLETED: {
    title: 'Service Completed',
    subtitle: 'Your service has been completed. Please confirm and pay.',
    icon: CheckCircle2,
  },
  CANCELLED: {
    title: 'Booking Cancelled',
    subtitle: 'This booking has been cancelled.',
    icon: Clock,
  },
};

const TIMELINE_STEPS = [
  {
    id: '1',
    title: 'Booking Confirmed',
    subtitle: 'Your booking has been placed',
  },
  {
    id: '2',
    title: 'Provider Accepted',
    subtitle: 'A provider accepted your job',
  },
  { id: '3', title: 'Provider En Route', subtitle: 'Provider is on the way' },
  { id: '4', title: 'Provider Arrived', subtitle: 'Provider has arrived' },
  { id: '5', title: 'Service In Progress', subtitle: 'Work has started' },
  { id: '6', title: 'Completed', subtitle: 'Service finished' },
];

export default function TrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const goBack = useGoBack('/(tabs)/bookings');
  const {
    tracking,
    isConfirming,
    liveLocation,
    workerStatus,
    confirmCompletion,
  } = useBookingTracking(bookingId);

  const stepIndex = useMemo(() => {
    return workerStatus && STATUS_STEP_MAP[workerStatus] !== undefined
      ? STATUS_STEP_MAP[workerStatus]
      : 0;
  }, [workerStatus]);

  const handlePayment = () => {
    router.push(`/payment/${id}`);
  };

  const address = tracking?.booking?.service_requests?.addresses;
  const latest = tracking?.updates?.[0];
  const statusInfo = STATUS_INFO[workerStatus ?? ''] ?? {
    title: workerStatus?.replaceAll('_', ' ') ?? 'Loading...',
    subtitle: '',
    icon: Clock,
  };
  const StatusIcon = statusInfo.icon;
  const isCompleted = workerStatus === 'COMPLETED';
  const isPendingConfirmation = workerStatus === 'PENDING_CONFIRMATION';
  const isCancelled = workerStatus === 'CANCELLED';
  const isActive = !isCompleted && !isCancelled;
  const workerAccountId = tracking?.booking?.worker_account_id as
    | string
    | undefined;

  const reportWorker = () => {
    const { to, subject, body } = buildProviderReportEmail({
      bookingId: bookingId ?? '',
      providerName: tracking?.booking?.worker_profiles?.display_name,
      providerAccountId: workerAccountId,
      bookingStatus: workerStatus,
    });
    void Linking.openURL(
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <Screen safeArea backgroundColor={theme.colors.surface}>
      <View style={styles.wideColumn}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={goBack}
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
        {isActive &&
          address?.latitude != null &&
          address?.longitude != null && (
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
                  tracking?.booking?.worker_start_lat != null
                    ? Number(tracking.booking.worker_start_lat)
                    : tracking?.booking?.worker_profiles?.latitude != null
                      ? Number(tracking.booking.worker_profiles.latitude)
                      : (address?.latitude != null ? Number(address.latitude) + 0.012 : undefined)
                }
                startLng={
                  tracking?.booking?.worker_start_lng != null
                    ? Number(tracking.booking.worker_start_lng)
                    : tracking?.booking?.worker_profiles?.longitude != null
                      ? Number(tracking.booking.worker_profiles.longitude)
                      : (address?.longitude != null ? Number(address.longitude) + 0.012 : undefined)
                }
                workerLat={
                  ['WORKER_ARRIVED', 'SERVICE_STARTED', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'COMPLETED'].includes(workerStatus ?? '')
                    ? (latest
                        ? Number(latest.latitude)
                        : (tracking?.booking?.worker_start_lat != null
                            ? Number(tracking.booking.worker_start_lat)
                            : (tracking?.booking?.worker_profiles?.latitude != null
                                ? Number(tracking.booking.worker_profiles.latitude)
                                : (address?.latitude != null ? Number(address.latitude) + 0.012 : undefined))))
                    : (liveLocation?.latitude ??
                        (latest
                          ? Number(latest.latitude)
                          : (tracking?.booking?.worker_start_lat != null
                              ? Number(tracking.booking.worker_start_lat)
                              : (tracking?.booking?.worker_profiles?.latitude != null
                                  ? Number(tracking.booking.worker_profiles.latitude)
                                  : (address?.latitude != null ? Number(address.latitude) + 0.012 : undefined)))))
                }
                workerLng={
                  ['WORKER_ARRIVED', 'SERVICE_STARTED', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'COMPLETED'].includes(workerStatus ?? '')
                    ? (latest
                        ? Number(latest.longitude)
                        : (tracking?.booking?.worker_start_lng != null
                            ? Number(tracking.booking.worker_start_lng)
                            : (tracking?.booking?.worker_profiles?.longitude != null
                                ? Number(tracking.booking.worker_profiles.longitude)
                                : (address?.longitude != null ? Number(address.longitude) + 0.012 : undefined))))
                    : (liveLocation?.longitude ??
                        (latest
                          ? Number(latest.longitude)
                          : (tracking?.booking?.worker_start_lng != null
                              ? Number(tracking.booking.worker_start_lng)
                              : (tracking?.booking?.worker_profiles?.longitude != null
                                  ? Number(tracking.booking.worker_profiles.longitude)
                                  : (address?.longitude != null ? Number(address.longitude) + 0.012 : undefined)))))
                }
              />
            </View>
          )}

        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            {
              borderLeftColor: isCompleted
                ? '#2E7D32'
                : isCancelled
                  ? '#C62828'
                  : theme.colors.primary,
            },
          ]}
        >
          <StatusIcon
            size={24}
            color={
              isCompleted
                ? '#2E7D32'
                : isCancelled
                  ? '#C62828'
                  : theme.colors.primary
            }
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
            >
              {statusInfo.title}
            </Text>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary, marginTop: 2 },
              ]}
            >
              {statusInfo.subtitle}
            </Text>
          </View>
        </View>

        {/* Route Summary - show when accepted/preparing/en_route */}
        {['ACCEPTED', 'WORKER_PREPARING', 'WORKER_EN_ROUTE'].includes(
          workerStatus ?? '',
        ) && (
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
                {tracking?.booking?.worker_profiles?.display_name ??
                  'Assigned Provider'}
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
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push(`/messages/chat?id=${id}`)}
            >
              <MessageSquare color={theme.colors.primary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.safetyActions}>
          <Button
            title="Report Provider"
            variant="outlined"
            onPress={reportWorker}
            fullWidth
          />
        </View>

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

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text
            style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}
          >
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
        {isPendingConfirmation ? (
          <Button
            title={isConfirming ? 'Confirming...' : 'Confirm Job Completion'}
            onPress={() => void confirmCompletion()}
            fullWidth
          />
        ) : isCompleted ? (
          <Button
            title="Continue to Payment"
            onPress={handlePayment}
            fullWidth
          />
        ) : isCancelled ? (
          <Button
            title="Back to Bookings"
            variant="outlined"
            onPress={goBack}
            fullWidth
          />
        ) : (
          <View style={styles.footerStatus}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              Your provider will update the status as they work
            </Text>
          </View>
        )}
      </View>
      </View>
    </Screen>
  );
}
