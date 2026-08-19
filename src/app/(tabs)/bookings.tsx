import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { MapPin, Calendar as CalendarIcon, Clock } from 'lucide-react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { fetchBookings, subscribeToBookingFeed } from '@/services/api';
import {
  CUSTOMER_BOOKING_TABS,
  getCustomerBookingTab,
  getInitialCustomerBookingTab,
} from '@/services/bookingTabs';

const RECENT_BOOKINGS_LIMIT = 5;

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  PENDING: { label: 'Awaiting Worker Acceptance', variant: 'warning' },
  ACCEPTED: { label: 'Confirmed', variant: 'info' },
  WORKER_PREPARING: { label: 'Confirmed · Preparing', variant: 'info' },
  WORKER_EN_ROUTE: { label: 'En Route', variant: 'info' },
  WORKER_ARRIVED: { label: 'Arrived', variant: 'info' },
  SERVICE_STARTED: { label: 'In Progress', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  PENDING_CONFIRMATION: { label: 'Awaiting Your Confirmation', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
};

function BookingSkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonProvider}>
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

export default function BookingsScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string | string[] }>();
  const [activeTab, setActiveTab] = useState(() =>
    getInitialCustomerBookingTab(filter),
  );
  const tabsRef = useRef<ScrollView>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(getInitialCustomerBookingTab(filter));
    setShowAll(false);
  }, [filter]);

  useEffect(() => {
    if (activeTab === 'Cancelled') {
      tabsRef.current?.scrollToEnd({ animated: false });
    }
  }, [activeTab]);

  const load = () => {
    setLoading(true);
    return void fetchBookings().then((result) => {
      if (result.error || !Array.isArray(result.data)) {
        setBookings([]);
        setLoading(false);
        return;
      }
      setBookings(
        result.data.map((row) => {
          const raw = String(row.rawStatus || row.status || '').toUpperCase();
          const tabGroup = getCustomerBookingTab(raw);

          return {
            ...row,
            service: row.category,
            provider: row.providerName,
            providerAvatar: row.avatarUri,
            location: row.address,
            tabGroup,
            rawStatus: raw,
          };
        })
      );
      setLoading(false);
    });
  };

  useEffect(() => {
    let active = true;
    let stopRealtime = () => {};
    load();
    void subscribeToBookingFeed('customer', load).then((stop) => {
      if (active) stopRealtime = stop;
      else stop();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      active = false;
      stopRealtime();
      appState.remove();
    };
  }, []);

  const filteredBookings = bookings.filter((b) => b.tabGroup === activeTab);
  const visibleBookings = showAll
    ? filteredBookings
    : filteredBookings.slice(0, RECENT_BOOKINGS_LIMIT);

  return (
    <Screen safeArea backgroundColor={theme.colors.background} style={{ paddingBottom: 0 }} keyboardAvoiding={false}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabsContainer}>
        <ScrollView
          ref={tabsRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
          onContentSizeChange={() => {
            if (activeTab === 'Cancelled') {
              tabsRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          {CUSTOMER_BOOKING_TABS.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === tab }}
              onPress={() => {
                setActiveTab(tab);
                setShowAll(false);
              }}
            >
              <Text style={[theme.typography.button, { color: activeTab === tab ? theme.colors.surface : theme.colors.textSecondary, fontSize: 13 }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <BookingSkeletonCard />
          <BookingSkeletonCard />
          <BookingSkeletonCard />
        </ScrollView>
      ) : null}

      {!loading ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          {filteredBookings.length === 0 ? (
            <EmptyState 
              icon={CalendarIcon} 
              title={`No ${activeTab} Bookings`} 
              description={`You don't have any ${activeTab.toLowerCase()} bookings at the moment. Explore services to book a professional!`}
            />
          ) : (
            <>
            {visibleBookings.map((booking) => {
              const badge = STATUS_MAP[booking.rawStatus] ?? { label: booking.rawStatus || 'Active', variant: 'info' };
              return (
                <View key={booking.id}>
                  <TouchableOpacity 
                    testID="customer-booking-card"
                    style={styles.bookingCard}
                    onPress={() =>
                      booking.rawStatus === 'COMPLETED'
                        ? router.push(`/booking-summary/${booking.id}`)
                        : router.push(`/tracking/${booking.id}`)
                    }
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.providerRow}>
                        <Avatar uri={booking.providerAvatar} size={40} name={booking.provider} />
                        <View style={{ flex: 1 }}>
                          <Text style={theme.typography.h4}>{booking.service}</Text>
                          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
                            Provider: {booking.provider}
                          </Text>
                        </View>
                      </View>
                      <Badge
                        label={badge.label}
                        variant={badge.variant as any}
                        size="sm"
                      />
                    </View>

                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <CalendarIcon color={theme.colors.textTertiary} size={16} />
                        <Text style={[theme.typography.caption, styles.detailText]}>{booking.date}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Clock color={theme.colors.textTertiary} size={16} />
                        <Text style={[theme.typography.caption, styles.detailText]}>{booking.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MapPin color={theme.colors.textTertiary} size={16} />
                        <Text style={[theme.typography.caption, styles.detailText]} numberOfLines={1} ellipsizeMode="tail">{booking.location}</Text>
                      </View>
                    </View>

                    {booking.rawStatus === 'CANCELLED' && booking.cancellationReason ? (
                      <View style={[styles.cancelledReason, { borderTopWidth: 1, borderTopColor: theme.colors.borderLight }]}>
                        <Text style={[theme.typography.caption, { color: theme.colors.error, fontStyle: 'italic' }]}>
                          Reason: {booking.cancellationReason}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <Text style={[theme.typography.h4, { color: theme.colors.primary }]}>{booking.price}</Text>
                      <Text style={[theme.typography.caption, { color: theme.colors.textTertiary }]}>
                        {booking.rawStatus === 'PENDING_CONFIRMATION' ? 'Awaiting confirmation' : booking.rawStatus === 'IN_PROGRESS' ? 'Tap to view' : 'Tap to view'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
            {!showAll && filteredBookings.length > RECENT_BOOKINGS_LIMIT ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.seeAllButton}
                onPress={() => setShowAll(true)}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            ) : null}
            </>
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = {
  header: { paddingVertical: theme.spacing.md, alignItems: 'center' as const },
  tabsContainer: { marginBottom: theme.spacing.md },
  tabsScroll: { gap: theme.spacing.sm, flexGrow: 1, justifyContent: 'center' as const },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
  tabButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  content: { flex: 1 },
  contentInner: { paddingBottom: 88 },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },
  providerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.sm, flex: 1 },
  cardDetails: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  detailRow: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1 },
  detailText: { color: theme.colors.textSecondary, marginLeft: 4, flexShrink: 1 },
  cardFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelledReason: {
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  seeAllButton: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: theme.spacing.md,
  },
  seeAllText: {
    ...theme.typography.button,
    color: theme.colors.primary,
    textDecorationLine: 'underline' as const,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  skeletonHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: theme.spacing.md,
  },
  skeletonProvider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
    flex: 1,
  },
  skeletonDetails: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  skeletonFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
};
