import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Bell, Search, ChevronRight, Briefcase, Circle, MapPin, Clock, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { DispatchOffer as DispatchOfferCard } from '@/components/DispatchOffer';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import {
  fetchWalletTransactions,
  fetchWorkerBookings,
  fetchWorkerProfile,
  subscribeToTable,
  type WorkerBooking,
  type WorkerProfile,
} from '@/services/api';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import {
  getMyDispatchOffers,
  getMyWorkerLiveStatus,
  refreshWorkerPresence,
  respondToDispatch,
  subscribeToDispatch,
  type DispatchOffer,
  type WorkerLiveStatus,
} from '@/services/liveDispatch';
import { useWorkerPresence } from '@/context/WorkerPresenceContext';

const statusConfig: Record<string, { label: string; variant: any }> = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  worker_preparing: { label: 'Preparing', variant: 'info' },
  worker_en_route: { label: 'En Route', variant: 'info' },
  worker_arrived: { label: 'Arrived', variant: 'info' },
  service_started: { label: 'Started', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
};

export default function WorkerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);
  const currentBookingId = useWorkerBookingStore((s) => s.currentBookingId);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [workerBookings, setWorkerBookings] = useState<WorkerBooking[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([]);
  const { state: presenceState, message: presenceMessage, ready } = useWorkerPresence();
  const [liveStatus, setLiveStatus] = useState<WorkerLiveStatus | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const pingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = () =>
      void Promise.all([
        fetchWorkerProfile(),
        fetchWorkerBookings(),
        fetchWalletTransactions(),
      ])
        .then(([profile, bookings, transactions]) => {
          if (!profile.error) setWorkerProfile(profile.data);
          setWorkerBookings(bookings.data);
          setEarnings(
            transactions.data
              .filter((row) => row.credit)
              .reduce(
                (sum, row) => sum + Number(row.amount.replace(/[^0-9.]/g, '')),
                0,
              ),
          );
        })
        .catch((e) => console.warn('[worker-dashboard] load failed:', e));
    load();
    const stops = ['bookings', 'service_requests', 'wallet_transactions'].map(
      (table) => subscribeToTable(table, load),
    );
    return () => stops.forEach((stop) => stop());
  }, []);

  useEffect(() => {
    let active = true;
    const loadOffers = () =>
      void getMyDispatchOffers()
        .then((rows) => {
          if (active) setDispatchOffers(rows);
        })
        .catch(() => {});
    const loadLiveStatus = () =>
      void getMyWorkerLiveStatus()
        .then((status) => {
          if (active) setLiveStatus(status);
        })
        .catch(() => {});
    loadOffers();
    loadLiveStatus();
    const stopDispatch = subscribeToDispatch(loadOffers);
    return () => {
      active = false;
      stopDispatch();
    };
  }, []);

  useEffect(() => {
    if (presenceState === 'online') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pingAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pingAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pingAnim.setValue(0);
    }
  }, [presenceState, pingAnim]);

  const refreshLocation = async () => {
    setRefreshingLocation(true);
    try {
      const status = await refreshWorkerPresence();
      setLiveStatus(status);
    } catch (error) {
      console.warn(error);
    } finally {
      setRefreshingLocation(false);
    }
  };

  const respond = async (offer: DispatchOffer, response: 'ACCEPTED' | 'DECLINED') => {
    await respondToDispatch(offer.dispatchId, response);
    setDispatchOffers((current) =>
      current.map((item) =>
        item.dispatchId === offer.dispatchId
          ? { ...item, status: response }
          : item,
      ),
    );
  };

  const activeBookings = workerBookings.filter(
    (row) => !['completed', 'cancelled'].includes(row.status),
  );
  const completed = workerBookings.filter(
    (row) => row.status === 'completed',
  ).length;
  const todayStats = [
    {
      label: 'Active',
      value: workerBookings
        .filter((row) =>
          [
            'worker_en_route',
            'worker_arrived',
            'service_started',
            'in_progress',
          ].includes(row.status),
        )
        .length.toString(),
    },
    {
      label: 'Pending',
      value: workerBookings
        .filter((row) =>
          ['pending', 'accepted', 'worker_preparing'].includes(row.status),
        )
        .length.toString(),
    },
    { label: 'Completed', value: completed.toString() },
    { label: 'Earnings', value: `₱${earnings.toLocaleString()}` },
  ];
  const completionRate = workerBookings.length
    ? Math.round((completed / workerBookings.length) * 100)
    : 0;
  const incomingJob = dispatchOffers.find((o) => o.status === 'OFFERED' || o.status === 'VIEWED');

  const isOnline = presenceState === 'online';

  return (
    <View style={styles.container}>
      <View style={[styles.topNav, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.searchBar}>
            <Search color={theme.colors.textSecondary} size={20} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search for everything"
              style={styles.searchInput}
              placeholderTextColor={theme.colors.textTertiary}
              editable={false}
              pointerEvents="none"
            />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => router.push('/notifications')}>
            <Bell color={theme.colors.surface} size={24} />
            <View style={styles.badge} />
          </Pressable>
          <Pressable style={styles.avatarButton} onPress={() => router.push('/(worker)/profile')}>
            <Image
              source={workerProfile?.avatarUri}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Today Stats */}
        <View style={styles.section}>
          <View style={styles.statsCard}>
            {todayStats.map((stat, index) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statItem}>
                  <Text style={theme.typography.h3}>{stat.value}</Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
                </View>
                {index < todayStats.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Live Status */}
        <View style={styles.section}>
          <Pressable
            onPress={() => void refreshLocation()}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
            <View style={[styles.liveCard, isOnline && styles.liveCardActive]}>
              <View style={styles.liveHeader}>
                <View style={styles.liveDotRow}>
                  <View style={styles.liveDotWrapper}>
                    {isOnline && (
                      <Animated.View
                        style={[
                          styles.liveDotPing,
                          {
                            opacity: pingAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
                            transform: [{ scale: pingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
                          },
                        ]}
                      />
                    )}
                    <View style={[styles.liveDot, isOnline ? styles.liveDotActive : styles.liveDotInactive]} />
                  </View>
                  <Text style={styles.liveLabel}>
                    {isOnline ? 'Live and receiving nearby requests' : 'Live matching is not active'}
                  </Text>
                </View>
                <View style={[styles.liveBadge, isOnline ? styles.liveBadgeActive : styles.liveBadgeInactive]}>
                  <Text style={[styles.liveBadgeText, isOnline ? styles.liveBadgeTextActive : styles.liveBadgeTextInactive]}>
                    {isOnline ? 'Live' : 'Offline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.liveSubtitle}>
                {!ready
                  ? ''
                  : presenceMessage ||
                    {
                      starting: 'Starting location sharing…',
                      paused: 'Tab inactive — matching will pause after 60 seconds.',
                      offline: 'Return to this tab to go online.',
                      permission_denied: 'Allow location access in your browser.',
                      not_ready: 'Complete Service Availability and switch Available for matching on.',
                      error: 'Location sharing could not start.',
                      online: 'Your foreground location updates every 10–15 seconds.',
                    }[presenceState]}
              </Text>
              <View style={styles.liveDivider} />
              <View style={styles.liveDetailList}>
                <View style={styles.liveDetailRow}>
                  <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <Circle size={14} color={theme.colors.textTertiary} />
                    <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.textTertiary }} />
                  </View>
                  <Text style={styles.liveDetailText}>
                    <Text style={styles.liveDetailLabel}>Service area:</Text>{' '}
                    {liveStatus?.serviceArea ?? 'Not configured'}
                    {liveStatus?.radiusMeters
                      ? ` · ${(liveStatus.radiusMeters / 1000).toFixed(0)} km radius`
                      : ''}
                  </Text>
                </View>
                <View style={styles.liveDetailRow}>
                  <MapPin size={14} color={theme.colors.textTertiary} />
                  <Text style={styles.liveDetailText}>
                    <Text style={styles.liveDetailLabel}>Current location:</Text>{' '}
                    {liveStatus?.latitude != null && liveStatus.longitude != null
                      ? `${liveStatus.latitude.toFixed(4)}, ${liveStatus.longitude.toFixed(4)}`
                      : 'Waiting for coordinates'}
                  </Text>
                </View>
                <View style={styles.liveDetailRow}>
                  <Clock size={14} color={theme.colors.textTertiary} />
                  <Text style={styles.liveDetailText}>
                    <Text style={styles.liveDetailLabel}>Last update:</Text>{' '}
                    {liveStatus?.lastSeenAt
                      ? new Date(liveStatus.lastSeenAt).toLocaleTimeString()
                      : 'No heartbeat received'}
                  </Text>
                </View>
              </View>
              <Pressable
                disabled={refreshingLocation}
                style={[styles.liveRefreshBtn, { borderColor: isOnline ? theme.colors.success : theme.colors.warning }, refreshingLocation && { opacity: 0.6 }]}
                onPress={() => void refreshLocation()}
              >
                <RefreshCw size={14} color={isOnline ? theme.colors.success : theme.colors.warning} />
                <Text style={[styles.liveRefreshText, { color: isOnline ? theme.colors.success : theme.colors.warning }]}>
                  {refreshingLocation ? 'Refreshing…' : 'Refresh location and matching setup'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </View>

        {/* Dispatch Offers */}
        {incomingJob && (
          <View style={styles.section}>
            <DispatchOfferCard
              category={incomingJob.category}
              area={incomingJob.area}
              distance={`${(incomingJob.distanceMeters / 1000).toFixed(1)} km`}
              budget={incomingJob.budget || (incomingJob.rateMinor == null ? 'Rate unavailable' : `₱${(incomingJob.rateMinor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
              postedTime={new Date(incomingJob.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              description={incomingJob.description}
              status={incomingJob.status === 'ACCEPTED' ? 'accepted' : incomingJob.status === 'DECLINED' ? 'declined' : 'pending'}
              onAccept={() => void respond(incomingJob, 'ACCEPTED')}
              onDecline={() => {
                Alert.alert(
                  'Decline Request',
                  'Are you sure you want to decline this request?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Decline',
                      style: 'destructive',
                      onPress: () => void respond(incomingJob, 'DECLINED'),
                    },
                  ],
                );
              }}
              onPress={() => router.push(`/(worker)/booking-request/${incomingJob.serviceRequestId}`)}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}>Quick Actions</Text>
          <QuickActionsGrid />
        </View>

        {/* Active Bookings */}
        <View style={styles.section}>
          <View style={styles.bookingsContainer}>
            <View style={styles.bookingsSectionHeader}>
              <Text style={theme.typography.h4}>Active Bookings</Text>
              <Pressable onPress={() => router.push('/(worker)/bookings')} style={styles.seeAllBtn}>
                <Text style={[theme.typography.caption, { color: theme.colors.primary }]}>See All</Text>
                <ChevronRight size={14} color={theme.colors.primary} />
              </Pressable>
            </View>
            {activeBookings.length === 0 ? (
              <Text style={[theme.typography.body2, { color: theme.colors.textTertiary, textAlign: 'center', paddingVertical: theme.spacing.lg }]}>
                No active bookings
              </Text>
            ) : (
              activeBookings.slice(0, 3).map((booking) => (
                <Pressable
                  key={booking.id}
                  style={({ pressed }) => [styles.bookingCard, { opacity: pressed ? 0.95 : 1 }]}
                  onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}
                >
                  <View style={styles.bookingHeader}>
                    <Avatar uri={booking.customerAvatar} size={40} />
                    <View style={styles.bookingInfo}>
                      <Text style={theme.typography.body1}>{booking.customerName}</Text>
                      <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{booking.service}</Text>
                    </View>
                    <Badge label={(statusConfig[booking.status] ?? { label: booking.status }).label} variant={(statusConfig[booking.status] ?? { variant: 'info' }).variant} />
                  </View>
                  <View style={styles.bookingMeta}>
                    <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>{booking.time}</Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>·</Text>
                    <Text style={[theme.typography.caption, { color: theme.colors.textTertiary, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">{booking.address}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Worker Profile Card */}
        <View style={styles.section}>
          <View style={styles.perfCard}>
            <View style={styles.perfHeader}>
              <View style={styles.perfAvatar}>
                <Text style={[theme.typography.h4, { color: theme.colors.surface }]}>JR</Text>
              </View>
              <View style={styles.perfInfo}>
                <Text style={theme.typography.h4}>{workerProfile?.name ?? ''}</Text>
                <Badge
                  label={
                    workerProfile?.verificationStatus === 'verified'
                      ? 'VERIFIED'
                      : workerProfile?.verificationStatus === 'rejected'
                        ? 'REJECTED'
                        : workerProfile?.verificationStatus === 'needs_review'
                          ? 'NEEDS REVIEW'
                          : 'PENDING'
                  }
                  variant={
                    workerProfile?.verificationStatus === 'verified'
                      ? 'success'
                      : workerProfile?.verificationStatus === 'rejected'
                        ? 'error'
                        : 'warning'
                  }
                  size="sm"
                />
              </View>
            </View>
            <View style={styles.perfStats}>
              {[
                { label: 'Completion Rate', val: completionRate, color: theme.colors.success },
                { label: 'Average Rating', val: Math.round(((workerProfile?.rating ?? 0) / 5) * 100), color: theme.colors.info },
                { label: 'Profile Completion', val: workerProfile?.bio ? 100 : 75, color: theme.colors.warning },
              ].map((s) => (
                <View key={s.label} style={styles.perfRow}>
                  <View style={styles.perfRowTop}>
                    <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>{s.label}</Text>
                    <Text style={[theme.typography.caption, { fontWeight: '600', color: s.color }]}>{s.val}%</Text>
                  </View>
                  <View style={styles.perfTrack}>
                    <View style={[styles.perfFill, { width: `${s.val}%`, backgroundColor: s.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topNav: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: '#1e3a8a',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  headerAvatar: { width: '100%', height: '100%' },
  content: { flex: 1, zIndex: 5 },
  contentContainer: {
    paddingBottom: theme.spacing.xxxl,
    paddingTop: theme.spacing.lg,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: theme.colors.borderLight },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.layout.screenPadding,
  },

  // Live Status Card
  liveCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderColor: theme.colors.warning,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  liveCardActive: { borderColor: theme.colors.success },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  liveDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  liveDotWrapper: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveDotActive: { backgroundColor: theme.colors.success },
  liveDotInactive: { backgroundColor: theme.colors.warning },
  liveDotPing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
    opacity: 0.3,
  },
  liveLabel: {
    ...theme.typography.body2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  liveBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    marginLeft: theme.spacing.sm,
  },
  liveBadgeActive: { backgroundColor: theme.colors.successBackground },
  liveBadgeInactive: { backgroundColor: theme.colors.warningBackground },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveBadgeTextActive: { color: '#065f46' },
  liveBadgeTextInactive: { color: '#92400e' },
  liveSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  liveDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.md,
  },
  liveDetailList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  liveDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  liveDetailText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  liveDetailLabel: {
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  liveRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  liveRefreshText: {
    ...theme.typography.button,
    fontSize: 13,
  },

  // Bookings
  bookingsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  bookingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  bookingCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center' },
  bookingInfo: { flex: 1, marginLeft: theme.spacing.sm },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },

  // Performance Card (kept from current project)
  perfCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  perfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  perfAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfInfo: { flex: 1, gap: 2 },
  perfStats: { gap: theme.spacing.md },
  perfRow: { gap: theme.spacing.xs },
  perfRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfTrack: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  perfFill: { height: '100%', borderRadius: theme.radius.full },
});
