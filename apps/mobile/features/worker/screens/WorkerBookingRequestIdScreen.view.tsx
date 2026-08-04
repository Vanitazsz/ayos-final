import { styles } from './WorkerBookingRequestIdScreen.styles';
import { View, ScrollView, Pressable, Image } from 'react-native';
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
import { Colors, AvatarSize } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { ThreeDotMenu } from '@/components/ThreeDotMenu';
import { BookingStepIndicator } from '@/components/booking/BookingStepIndicator';
import { BookingMap } from '@/components/booking/BookingMap';
import { RouteSummaryCard } from '@/components/booking/RouteSummaryCard';
import { CompletedSummary } from '@/components/booking/CompletedSummary';
import type { useWorkerBookingRequestIdScreenController } from '../hooks/useWorkerBookingRequestIdScreenController';
import { workerBookingStatusMeta } from '../logic/WorkerBookingRequestIdScreenLogic';
export function BookingRequestView({
  model,
}: {
  model: ReturnType<typeof useWorkerBookingRequestIdScreenController>;
}) {
  const {
    id,
    job,
    booking,
    isArriving,
    duration,
    routeDetails,
    isLoading,
    paymentStatus,
    handleDecline,
    handleAccept,
    handleConfirmDetails,
    handleArrived,
    handleComplete,
    handleUploadProof,
    handleLeaveFeedback,
    handleConfirmCash,
    handleReport,
    handleCall,
    handleCancelService,
    isCompleted,
    isCancelled,
    isActive,
    remainingTime,
    router,
  } = model;
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
                label={workerBookingStatusMeta(booking.status).label}
                variant={workerBookingStatusMeta(booking.status).variant}
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
                  label="Accept Booking ✅"
                  variant="primary"
                  leftIcon={<Calendar size={18} color={Colors.white} />}
                  fullWidth
                  onPress={handleAccept}
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
                  <AppText
                    variant="bodySm"
                    weight="semiBold"
                    color={Colors.cta}
                  >
                    Call
                  </AppText>
                </Pressable>
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
                <Pressable style={styles.contactBtn} onPress={handleCall}>
                  <Phone size={18} color={Colors.cta} />
                  <AppText
                    variant="bodySm"
                    weight="semiBold"
                    color={Colors.cta}
                  >
                    Call
                  </AppText>
                </Pressable>
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
                <Pressable style={styles.contactBtn} onPress={handleCall}>
                  <Phone size={18} color={Colors.cta} />
                  <AppText
                    variant="bodySm"
                    weight="semiBold"
                    color={Colors.cta}
                  >
                    Call
                  </AppText>
                </Pressable>
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
              <AppButton
                label="Add Proof of Work Photo"
                variant="outline"
                fullWidth
                onPress={handleUploadProof}
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
