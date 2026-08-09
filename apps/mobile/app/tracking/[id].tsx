import React, { useMemo } from 'react';
import {View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
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
  Image as ImageIcon,
  Phone,
  ShieldAlert,
} from 'lucide-react-native';
import { buildProviderReportEmail } from '@/services/support';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { styles } from '@/styles/tracking/_tracking.styles';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { showAlert } from '@/components/AppAlert';


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
    proofPhotos,
    isLoadingProofPhotos,
    proofPhotosError,
    isConfirmingArrival,
    trackingActionError,
    confirmArrival,
    confirmCompletion,
  } = useBookingTracking(bookingId);

  const stepIndex = useMemo(() => {
    return workerStatus && STATUS_STEP_MAP[workerStatus] !== undefined
      ? STATUS_STEP_MAP[workerStatus]
      : 0;
  }, [workerStatus]);

  const handlePayment = () => {
    router.push(`/payment/${bookingId}`);
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
  const isEnRoute = workerStatus === 'WORKER_EN_ROUTE';
  const isCancelled = workerStatus === 'CANCELLED';
  const isActive = !isCompleted && !isCancelled;
  const workerAccountId = tracking?.booking?.worker_account_id as
    | string
    | undefined;
  const workerMobile = tracking?.booking?.worker_profiles?.accounts?.mobile as
    | string
    | undefined;

  const callNumber = async (number: string | undefined, label: string) => {
    if (!number) {
      showAlert(label, 'No phone number is available for this booking.');
      return;
    }
    const sanitized = number.replace(/[^0-9+#*]/g, '');
    if (!sanitized) {
      showAlert(label, 'The phone number is unavailable.');
      return;
    }
    const url = `tel:${sanitized}`;
    try {
      if (!(await Linking.canOpenURL(url))) {
        throw new Error('This device cannot place phone calls.');
      }
      await Linking.openURL(url);
    } catch (error) {
      showAlert(
        label,
        error instanceof Error ? error.message : 'Unable to place the call.',
      );
    }
  };

  const handleEmergency = () => {
    showAlert(
      'Call Emergency Services?',
      'Call 911 only if someone is in immediate danger.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 911',
          style: 'destructive',
          onPress: () => void callNumber('911', 'Emergency call failed'),
        },
      ],
    );
  };

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

        {(isPendingConfirmation || isCompleted) && (
          <View style={styles.proofCard}>
            <View style={styles.proofHeader}>
              <ImageIcon size={16} color={theme.colors.primary} />
              <Text style={styles.proofTitle}>Proof of Work</Text>
            </View>
            {isLoadingProofPhotos ? (
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>Loading proof photos…</Text>
            ) : proofPhotosError ? (
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>Proof photos are temporarily unavailable.</Text>
            ) : proofPhotos.length === 0 ? (
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>No proof photos were attached for this booking.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.proofScroll}>
                {proofPhotos.map((photo, index) =>
                  photo.signedUrl ? (
                    <Image
                      key={photo.id ?? index}
                      source={{ uri: photo.signedUrl }}
                      style={styles.proofImage}
                      resizeMode="cover"
                      accessibilityLabel={`Proof photo ${index + 1}`}
                    />
                  ) : (
                    <View
                      key={photo.id ?? index}
                      style={styles.proofPlaceholder}
                      accessibilityLabel={`Proof photo ${index + 1} unavailable`}
                    >
                      <ImageIcon size={28} color={theme.colors.textTertiary} />
                    </View>
                  ),
                )}
              </ScrollView>
            )}
          </View>
        )}

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

        <View style={styles.contactActions}>
          <TouchableOpacity
            style={styles.contactAction}
            onPress={() => void callNumber(workerMobile, 'Call provider')}
          >
            <Phone color={theme.colors.primary} size={18} />
            <Text style={styles.contactActionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emergencyAction}
            onPress={handleEmergency}
          >
            <ShieldAlert color={theme.colors.error} size={18} />
            <Text style={styles.emergencyActionText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {trackingActionError && (
          <View style={styles.actionErrorCard}>
            <Text style={styles.actionErrorText}>{trackingActionError}</Text>
          </View>
        )}

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
        {isEnRoute ? (
          <Button
            title={isConfirmingArrival ? 'Confirming Arrival...' : 'Confirm Arrival'}
            onPress={() => void confirmArrival()}
            disabled={isConfirmingArrival}
            fullWidth
          />
        ) : isPendingConfirmation ? (
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
