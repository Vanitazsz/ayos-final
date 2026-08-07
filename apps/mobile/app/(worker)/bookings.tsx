import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { CalendarDays, Clock, MapPin, CheckCircle2, XCircle, Receipt, Flag, Star, MessageSquare } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { showAlert } from '@/components/AppAlert';
import { styles } from '@/features/worker/screens/WorkerBookings.styles';
import { useWorkerBookings } from '@/hooks/useWorkerBookings';

const statusConfig: Record<string, { label: string; variant: string }> = {
  hired: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  worker_preparing: { label: 'Preparing', variant: 'info' },
  worker_en_route: { label: 'En Route', variant: 'info' },
  worker_arrived: { label: 'Arrived', variant: 'info' },
  service_started: { label: 'Started', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  pending_confirmation: {
    label: 'Awaiting Confirmation',
    variant: 'warning',
  },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  pending: { label: 'Pending', variant: 'warning' },
  pending_review: { label: 'Pending Review', variant: 'neutral' },
};

const BOOKING_TABS = ['Upcoming', 'In Progress', 'Pending', 'Completed', 'Cancelled', 'Reported'];

function BookingSkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonCustomer}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Skeleton width="70%" height={14} borderRadius={7} />
            <Skeleton width="45%" height={12} borderRadius={6} />
          </View>
        </View>
        <Skeleton width={72} height={22} borderRadius={11} />
      </View>
      <View style={styles.skeletonDetails}>
        <Skeleton width={88} height={12} borderRadius={6} />
        <Skeleton width={68} height={12} borderRadius={6} />
        <Skeleton width={80} height={12} borderRadius={6} />
      </View>
      <View style={styles.skeletonFooter}>
        <Skeleton width={128} height={34} borderRadius={17} />
        <Skeleton width={128} height={34} borderRadius={17} />
      </View>
    </View>
  );
}

export default function WorkerBookingsScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const {
    activeTab,
    setActiveTab,
    feedbackMap,
    loading,
    loadError,
    isCurrentlyWorking,
    load,
    accept,
    decline,
    filteredBookings,
  } = useWorkerBookings(filter);

  const comingSoon = () => showAlert('Coming Soon', 'Earnings receipts will be available in a future update.');

  return (
    <Screen safeArea backgroundColor={theme.colors.background} style={{ paddingBottom: 0 }} keyboardAvoiding={false}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {BOOKING_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[theme.typography.button, { color: activeTab === tab ? theme.colors.surface : theme.colors.textSecondary, fontSize: 13 }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <BookingSkeletonCard />
          <BookingSkeletonCard />
          <BookingSkeletonCard />
        </ScrollView>
      ) : null}
      {!loading && loadError ? (
        <View style={styles.centerState}>
          <Text style={[theme.typography.body1, { color: theme.colors.error }]}>{loadError}</Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !loadError ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {filteredBookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={`No ${activeTab} Bookings`}
              description={`You don't have any ${activeTab.toLowerCase()} bookings at the moment.`}
            />
          ) : (
            filteredBookings.map((booking) => (
              <View key={booking.id}>
                {/* ─── UPCOMING / IN PROGRESS / PENDING ─── */}
                {(activeTab === 'Upcoming' || activeTab === 'In Progress' || activeTab === 'Pending') && (
                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
                    onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}
                  >
                    <View style={styles.bookingCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.customerRow}>
                          <Avatar uri={booking.customerAvatar} size={40} />
                          <View>
                            <Text style={theme.typography.h4}>{booking.customerName}</Text>
                            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>{booking.service}</Text>
                          </View>
                        </View>
                        <Badge
                          label={(statusConfig[booking.status] ?? { label: booking.status }).label}
                          variant={((statusConfig[booking.status] ?? { variant: 'info' }).variant) as any}
                          size="sm"
                        />
                      </View>

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <CalendarDays color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText]}>{booking.date}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Clock color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText]}>{booking.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MapPin color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText]} numberOfLines={1} ellipsizeMode="tail">{booking.address}</Text>
                        </View>
                      </View>

                      {booking.hasParts !== undefined && (
                        <View style={[styles.partsRow, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight }]}>
                          <Text style={[theme.typography.caption, { color: booking.hasParts ? theme.colors.success : theme.colors.warning, fontWeight: '500' }]}>
                            {booking.hasParts ? 'Customer Has Parts' : 'Needs Parts'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={[theme.typography.h4, { color: theme.colors.primary }]}>{booking.price}</Text>
                        <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>
                          {booking.status === 'pending_confirmation' ? 'Awaiting confirmation' : activeTab === 'In Progress' ? (isCurrentlyWorking ? 'Working\u2026' : 'Tap to view') : activeTab === 'Pending' ? 'Awaiting confirmation' : 'Tap to view'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* ─── COMPLETED ─── */}
                {activeTab === 'Completed' && (
                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
                    onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}

                  >
                    <View style={[styles.bookingCard, styles.completedCard]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.customerRow}>
                          <CheckCircle2 size={20} color={theme.colors.success} />
                          <View>
                            <Text style={theme.typography.h4}>{booking.customerName}</Text>
                            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>{booking.service}</Text>
                          </View>
                        </View>
                        <Badge
                          label={(statusConfig[booking.status] ?? { label: booking.status }).label}
                          variant={((statusConfig[booking.status] ?? { variant: 'success' }).variant) as any}
                          size="sm"
                        />
                      </View>

                      <View style={[styles.completedInfo, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight }]}>
                        <View style={styles.completedRow}>
                          <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>Earnings</Text>
                          <Text style={[theme.typography.body1, { color: theme.colors.success, fontWeight: '700' }]}>{booking.price}</Text>
                        </View>
                        {booking.duration && (
                          <View style={styles.completedRow}>
                            <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>Duration</Text>
                            <Text style={[theme.typography.body1, { fontWeight: '600' }]}>{booking.duration}</Text>
                          </View>
                        )}
                      </View>

                      {booking.workerRating !== undefined && (
                        <View style={[styles.reviewSummary, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight }]}>
                          <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                color={star <= booking.workerRating! ? theme.colors.warning : theme.colors.border}
                                fill={star <= booking.workerRating! ? theme.colors.warning : 'transparent'}
                              />
                            ))}
                            <Text style={[theme.typography.caption, { color: theme.colors.textTertiary, marginLeft: 4 }]}>
                              {booking.workerRating}/5
                            </Text>
                          </View>
                          {booking.workerReview && (
                            <Text
                              style={[theme.typography.caption, { color: theme.colors.textSecondary, fontStyle: 'italic', lineHeight: 18 }]}
                              numberOfLines={2}
                            >
                              &ldquo;{booking.workerReview}&rdquo;
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>Paid</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.feedbackBtn,
                              feedbackMap[booking.id]
                                ? { borderColor: theme.colors.success }
                                : { borderColor: theme.colors.primary },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/(worker)/leave-feedback/${booking.id}`);
                            }}
                          >
                            <MessageSquare
                              size={12}
                              color={
                                feedbackMap[booking.id]
                                  ? theme.colors.success
                                  : theme.colors.primary
                              }
                            />
                            <Text
                              style={[
                                theme.typography.caption,
                                {
                                  color: feedbackMap[booking.id]
                                    ? theme.colors.success
                                    : theme.colors.primary,
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              {feedbackMap[booking.id]
                                ? `Feedback (${feedbackMap[booking.id].rating}★)`
                                : 'Leave Feedback'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.primaryBtn} onPress={comingSoon}>
                            <Receipt size={12} color={theme.colors.surface} />
                            <Text style={[theme.typography.caption, { color: theme.colors.surface, fontWeight: '600' }]}>Receipt</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* ─── CANCELLED ─── */}
                {activeTab === 'Cancelled' && (
                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
                    onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}
                  >
                    <View style={[styles.bookingCard, styles.cancelledCard]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.customerRow}>
                          {booking.cancelledBy === 'worker' ? (
                            <XCircle size={20} color={theme.colors.warning} />
                          ) : (
                            <XCircle size={20} color={theme.colors.error} />
                          )}
                          <View>
                            <Text style={[theme.typography.h4, { color: theme.colors.textTertiary }]}>{booking.customerName}</Text>
                            <Text style={[theme.typography.body2, { color: theme.colors.textTertiary }]}>{booking.service}</Text>
                          </View>
                        </View>
                        <Badge
                          label={(statusConfig[booking.status] ?? { label: booking.status }).label}
                          variant={((statusConfig[booking.status] ?? { variant: 'error' }).variant) as any}
                          size="sm"
                        />
                      </View>

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <CalendarDays color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText, { color: theme.colors.textTertiary }]}>{booking.date}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Clock color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText, { color: theme.colors.textTertiary }]}>{booking.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MapPin color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText, { color: theme.colors.textTertiary }]} numberOfLines={1} ellipsizeMode="tail">{booking.address}</Text>
                        </View>
                      </View>

                      {booking.cancelledReason && (
                        <View style={[styles.cancelledReason, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight }]}>
                          <Text style={[theme.typography.caption, { color: booking.cancelledBy === 'worker' ? theme.colors.warning : theme.colors.error, fontStyle: 'italic' }]}>
                            {booking.cancelledBy === 'worker' ? `You cancelled: ${booking.cancelledReason}` : booking.cancelledReason}
                          </Text>
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={[theme.typography.h4, { color: theme.colors.textTertiary }]}>{booking.price}</Text>
                        <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>Tap to view</Text>
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* ─── REPORTED ─── */}
                {activeTab === 'Reported' && (
                  <Pressable
                    style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
                    onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}
                  >
                    <View style={[styles.bookingCard, styles.reportedCard]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.customerRow}>
                          <Flag size={20} color={theme.colors.error} />
                          <View>
                            <Text style={theme.typography.h4}>{booking.customerName}</Text>
                            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>{booking.service}</Text>
                          </View>
                        </View>
                        <Badge label="Reported" variant="error" size="sm" />
                      </View>

                      <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                          <CalendarDays color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText]}>{booking.date}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Clock color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText]}>{booking.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MapPin color={theme.colors.textTertiary} size={16} />
                          <Text style={[theme.typography.caption, styles.detailText]} numberOfLines={1} ellipsizeMode="tail">{booking.address}</Text>
                        </View>
                      </View>

                      {booking.reportedReason && (
                        <View style={[styles.reportedReason, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight }]}>
                          <Text style={[theme.typography.caption, { color: theme.colors.error, fontStyle: 'italic' }]}>
                            {booking.reportedReason}
                          </Text>
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={[theme.typography.h4, { color: theme.colors.primary }]}>{booking.price}</Text>
                        <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>Tap to view</Text>
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* ─── ACCEPT / DECLINE for pending bookings ─── */}
                {booking.status === 'pending' && (
                  <View style={styles.incomingActions}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => decline(booking.id)}
                    >
                      <Text style={[theme.typography.button, { color: theme.colors.error }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => void accept(booking.id)}
                    >
                      <Text style={[theme.typography.button, { color: theme.colors.surface }]}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
