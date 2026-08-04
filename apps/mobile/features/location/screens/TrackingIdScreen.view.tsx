import { styles } from './TrackingIdScreen.styles';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react-native';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import type { useTrackingIdScreenController } from '../hooks/useTrackingIdScreenController';
import { TRACKING_TIMELINE_STEPS } from '../logic/TrackingIdScreenLogic';
import { formatAddressParts, formatPesoMajor } from '@/utils/format';
export function TrackingView({
  model,
}: {
  model: ReturnType<typeof useTrackingIdScreenController>;
}) {
  const {
    router,
    id,
    tracking,
    isConfirming,
    liveLocation,
    bookingId,
    workerStatus,
    stepIndex,
    handlePayment,
    handleConfirmCompletion,
    address,
    latest,
    statusInfo,
    StatusIcon,
    isCompleted,
    isPendingConfirmation,
    isCancelled,
    isActive,
    contactAvailable,
    workerAccountId,
    reportWorker,
    blockWorker,
    disputeBooking,
    fetchAccountMobile,
  } = model;
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
        {isActive &&
          address?.latitude != null &&
          address?.longitude != null && (
            <View style={styles.mapContainer}>
              <BookingMap
                bookingId={bookingId}
                destinationLat={Number(address.latitude)}
                destinationLng={Number(address.longitude)}
                destinationAddress={formatAddressParts([
                  address.line1,
                  address.barangay,
                  address.city,
                ])}
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
                workerLat={
                  liveLocation?.latitude ??
                  (latest ? Number(latest.latitude) : undefined)
                }
                workerLng={
                  liveLocation?.longitude ??
                  (latest ? Number(latest.longitude) : undefined)
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
            destinationAddress={formatAddressParts([
              address?.line1,
              address?.barangay,
              address?.city,
            ])}
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
            {contactAvailable ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (workerAccountId) {
                    void fetchAccountMobile(workerAccountId).then((mobile) => {
                      if (mobile) void Linking.openURL(`tel:${mobile}`);
                    });
                  }
                }}
              >
                <Phone color={theme.colors.primary} size={20} />
              </TouchableOpacity>
            ) : null}
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
          <Button
            title="Block Provider"
            variant="outlined"
            onPress={blockWorker}
            fullWidth
          />
          <Button
            title="Open Dispute"
            variant="outlined"
            onPress={disputeBooking}
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
              Refund: {formatPesoMajor(tracking.booking.cancellations[0].refund_amount)}
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
            {TRACKING_TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index <= stepIndex;
              const isCurrent = index === stepIndex;
              const isLast = index === TRACKING_TIMELINE_STEPS.length - 1;

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
            onPress={() => void handleConfirmCompletion()}
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
            onPress={() => router.back()}
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
    </Screen>
  );
}
