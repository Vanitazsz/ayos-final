import React, { useEffect, useRef } from 'react';
import {View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Animated,} from 'react-native';
import { Bell, Search, ChevronRight, Circle, MapPin, Clock, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { DispatchOffer as DispatchOfferCard } from '@/components/DispatchOffer';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import {
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
import { showAlert } from '@/components/AppAlert';
import { styles } from './worker-dashboard.styles';
import { useWorkerDashboard } from '@/hooks/useWorkerDashboard';

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
  const {
    workerProfile,
    activeBookings,
    todayStats,
    completionRate,
    incomingJob,
    isOnline,
    presenceState,
    presenceMessage,
    ready,
    liveStatus,
    refreshingLocation,
    refreshLocation,
    respond,
  } = useWorkerDashboard();
  const pingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = () =>
      void Promise.all([
        fetchWorkerProfile(),
        fetchWorkerBookings(),
      ])
        .then(([profile, bookings]) => {
          if (!profile.error) setWorkerProfile(profile.data);
          setWorkerBookings(bookings.data);
          const completedBookingSum = (bookings.data ?? [])
            .filter((row) => row.status === 'completed')
            .reduce(
              (sum, row) =>
                sum + Number(row.price.replace(/[^0-9.]/g, '') || 0),
              0,
            );
          setEarnings(completedBookingSum);
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
                      starting: 'Starting location sharingâ€¦',
                      paused: 'Tab inactive â€” matching will pause after 60 seconds.',
                      offline: 'Return to this tab to go online.',
                      permission_denied: 'Allow location access in your browser.',
                      not_ready: 'Complete Service Availability and switch Available for matching on.',
                      error: 'Location sharing could not start.',
                      online: 'Your foreground location updates every 10â€“15 seconds.',
                    }[presenceState]}
              </Text>
              <View style={styles.liveDivider} />
              <View style={styles.liveDetailList}>
                <View style={styles.liveDetailRow}>
                  <View style={styles.liveDetailMarker}>
                    <Circle size={14} color={theme.colors.textTertiary} />
                    <View style={styles.liveDetailDot} />
                  </View>
                  <Text style={styles.liveDetailText}>
                    <Text style={styles.liveDetailLabel}>Service area:</Text>{' '}
                    {liveStatus?.serviceArea ?? 'Not configured'}
                    {liveStatus?.radiusMeters
                      ? ` Â· ${(liveStatus.radiusMeters / 1000).toFixed(0)} km radius`
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
                  {refreshingLocation ? 'Refreshingâ€¦' : 'Refresh location and matching setup'}
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
              budget={incomingJob.budget || (incomingJob.rateMinor == null ? 'Rate unavailable' : `â‚±${(incomingJob.rateMinor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
              postedTime={new Date(incomingJob.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              description={incomingJob.description}
              status={incomingJob.status === 'ACCEPTED' ? 'accepted' : incomingJob.status === 'DECLINED' ? 'declined' : 'pending'}
              onAccept={() => void respond(incomingJob, 'ACCEPTED')}
              onDecline={() => {
                showAlert(
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
                    <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>Â·</Text>
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
