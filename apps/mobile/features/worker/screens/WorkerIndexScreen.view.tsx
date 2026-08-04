import { styles } from './WorkerIndexScreen.styles';
import React from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { Bell, Search, ChevronRight, Briefcase } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { QuickActionsGrid } from '@/components/QuickActionsGrid';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import type { useWorkerIndexScreenController } from '../hooks/useWorkerIndexScreenController';
import { workerBookingStatusMeta } from '../logic/WorkerIndexScreenLogic';
import {
  formatCoordinates,
  formatKm,
  formatPesoMinor,
  formatTime,
  ratingToPercent,
} from '@/utils/format';
export function WorkerDashboardView({
  model,
}: {
  model: ReturnType<typeof useWorkerIndexScreenController>;
}) {
  const {
    insets,
    isCurrentlyWorking,
    currentBookingId,
    workerProfile,
    dispatchOffers,
    presenceState,
    presenceMessage,
    liveStatus,
    refreshingLocation,
    refreshLocation,
    respond,
    activeBookings,
    todayStats,
    completionRate,
    router,
    Image,
  } = model;
  return (
    <View style={styles.container}>
      {isCurrentlyWorking && (
        <Pressable
          style={[
            styles.workingBanner,
            { paddingTop: insets.top + theme.spacing.sm },
          ]}
          onPress={() =>
            router.push(`/(worker)/booking-request/${currentBookingId}`)
          }
        >
          <Briefcase size={16} color={theme.colors.surface} />
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.surface, fontWeight: '600' },
            ]}
          >
            You are currently working on a job — Tap to view
          </Text>
        </Pressable>
      )}
      <View
        style={[
          styles.topNav,
          {
            paddingTop:
              (isCurrentlyWorking ? 0 : insets.top) + theme.spacing.sm,
          },
        ]}
      >
        <View style={styles.greetingRow}>
          <View>
            <Text
              style={[
                theme.typography.body2,
                { color: 'rgba(255,255,255,0.8)' },
              ]}
            >
              Good morning,
            </Text>
            <Text
              style={[theme.typography.h3, { color: theme.colors.surface }]}
            >
              {workerProfile?.name.split(' ')[0] ?? ''} 👋
            </Text>
          </View>
        </View>
        <View style={styles.headerTopRow}>
          <View style={styles.searchBar}>
            <Search
              color={theme.colors.textSecondary}
              size={20}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Search for everything"
              style={styles.searchInput}
              placeholderTextColor={theme.colors.textTertiary}
              editable={false}
            />
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell color={theme.colors.surface} size={24} />
            <View style={styles.badge} />
          </Pressable>
          <Pressable
            style={styles.avatarButton}
            onPress={() => router.push('/(worker)/profile')}
          >
            <Image
              source={workerProfile?.avatarUri}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          </Pressable>
        </View>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {todayStats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statItemHeader}>
                <Text
                  style={[theme.typography.h3, { color: theme.colors.surface }]}
                >
                  {stat.value}
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: 'rgba(255,255,255,0.7)' },
                  ]}
                >
                  {stat.label}
                </Text>
              </View>
              {index < todayStats.length - 1 && (
                <View style={styles.statDividerHeader} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <View
            style={[
              styles.presenceCard,
              presenceState === 'online' && styles.presenceOnline,
            ]}
          >
            <Text style={[theme.typography.body2, { fontWeight: '700' }]}>
              {presenceState === 'online'
                ? 'Live and receiving nearby requests'
                : 'Live matching is not active'}
            </Text>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {presenceMessage ||
                {
                  starting: 'Starting location sharing…',
                  paused:
                    'Tab inactive — matching will pause after 60 seconds.',
                  offline: 'Return to this tab to go online.',
                  permission_denied: 'Allow location access in your browser.',
                  not_ready: 'Complete Service Availability and go online.',
                  error: 'Location sharing could not start.',
                  online:
                    'Your foreground location updates every 10–15 seconds.',
                }[presenceState]}
            </Text>
            <View style={styles.liveDetails}>
              <Text style={styles.liveDetail}>
                Subdivision:{' '}
                {liveStatus?.subdivisionName ??
                  'Not assigned — using live distance and service radius'}
              </Text>
              <Text style={styles.liveDetail}>
                Service area: {liveStatus?.serviceArea ?? 'Not configured'}
                {liveStatus?.radiusMeters
                  ? ` · ${formatKm(liveStatus.radiusMeters, 0)} km radius`
                  : ''}
              </Text>
              <Text style={styles.liveDetail}>
                Current location:{' '}
                {liveStatus?.latitude != null && liveStatus.longitude != null
                  ? formatCoordinates(liveStatus.latitude, liveStatus.longitude)
                  : 'Waiting for coordinates'}
              </Text>
              <Text style={styles.liveDetail}>
                Last update:{' '}
                {liveStatus?.lastSeenAt
                  ? formatTime(liveStatus.lastSeenAt)
                  : 'No heartbeat received'}
              </Text>
            </View>
            <Pressable
              disabled={refreshingLocation}
              style={[
                styles.refreshLocationButton,
                refreshingLocation && { opacity: 0.6 },
              ]}
              onPress={() => void refreshLocation()}
            >
              <Text style={styles.refreshLocationText}>
                {refreshingLocation
                  ? 'Refreshing…'
                  : 'Refresh location and matching setup'}
              </Text>
            </Pressable>
          </View>
        </View>
        {dispatchOffers.map((offer) => (
          <View key={offer.dispatchId} style={styles.section}>
            <View style={styles.dispatchCard}>
              <Text style={theme.typography.h4}>
                Nearby {offer.category} request
              </Text>
              <Text
                style={[
                  theme.typography.body2,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {offer.area} · {formatKm(offer.distanceMeters)} km ·{' '}
                {offer.rateMinor == null
                  ? 'Rate unavailable'
                  : `${formatPesoMinor(offer.rateMinor)} service rate`}
              </Text>
              <Text style={theme.typography.body2}>{offer.description}</Text>
              {offer.status === 'ACCEPTED' ? (
                <Text
                  style={{ color: theme.colors.success, fontWeight: '700' }}
                >
                  Accepted — waiting for the customer to choose.
                </Text>
              ) : (
                <View style={styles.dispatchActions}>
                  <Pressable
                    style={styles.declineButton}
                    onPress={() => void respond(offer, 'DECLINED')}
                  >
                    <Text
                      style={{ color: theme.colors.primary, fontWeight: '700' }}
                    >
                      Decline
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => void respond(offer, 'ACCEPTED')}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      Accept request
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text
            style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}
          >
            Quick Actions
          </Text>
          <QuickActionsGrid />
        </View>

        {/* Active Bookings */}
        <View style={styles.section}>
          <Text
            style={[theme.typography.h4, { marginBottom: theme.spacing.md }]}
          >
            Active Bookings
          </Text>
          {activeBookings.map((booking) => (
            <Pressable
              key={booking.id}
              style={({ pressed }) => [
                styles.bookingCard,
                { opacity: pressed ? 0.95 : 1 },
              ]}
              onPress={() =>
                router.push(`/(worker)/booking-request/${booking.id}`)
              }
            >
              <View style={styles.bookingHeader}>
                <Avatar uri={booking.customerAvatar} size={40} />
                <View style={styles.bookingInfo}>
                  <Text style={theme.typography.body1}>
                    {booking.customerName}
                  </Text>
                  <Text
                    style={[
                      theme.typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {booking.service}
                  </Text>
                </View>
                <Badge
                  label={workerBookingStatusMeta(booking.status).label}
                  variant={workerBookingStatusMeta(booking.status).variant}
                />
              </View>
              <View style={styles.bookingMeta}>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  {booking.time}
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  ·
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textTertiary },
                  ]}
                >
                  {booking.address}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            style={styles.seeAllBtn}
            onPress={() => router.push('/(worker)/bookings')}
          >
            <Text
              style={[theme.typography.button, { color: theme.colors.primary }]}
            >
              See All Bookings
            </Text>
            <ChevronRight size={18} color={theme.colors.primary} />
          </Pressable>
        </View>

        {/* Worker Profile Card */}
        <View style={styles.section}>
          <View style={styles.perfCard}>
            <View style={styles.perfHeader}>
              <View style={styles.perfAvatar}>
                <Text
                  style={[theme.typography.h4, { color: theme.colors.surface }]}
                >
                  JR
                </Text>
              </View>
              <View style={styles.perfInfo}>
                <Text style={theme.typography.h4}>
                  {workerProfile?.name ?? ''}
                </Text>
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
                {
                  label: 'Completion Rate',
                  val: completionRate,
                  color: theme.colors.success,
                },
                {
                  label: 'Average Rating',
                  val: ratingToPercent(workerProfile?.rating),
                  color: theme.colors.info,
                },
                {
                  label: 'Profile Completion',
                  val: workerProfile?.bio ? 100 : 75,
                  color: theme.colors.warning,
                },
              ].map((s) => (
                <View key={s.label} style={styles.perfRow}>
                  <View style={styles.perfRowTop}>
                    <Text
                      style={[
                        theme.typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={[
                        theme.typography.caption,
                        { fontWeight: '600', color: s.color },
                      ]}
                    >
                      {s.val}%
                    </Text>
                  </View>
                  <View style={styles.perfTrack}>
                    <View
                      style={[
                        styles.perfFill,
                        { width: `${s.val}%`, backgroundColor: s.color },
                      ]}
                    />
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
