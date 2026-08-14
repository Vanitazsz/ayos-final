import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { MapPin, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { fetchBookings, subscribeToBookingFeed } from '@/services/api';
import {
  CUSTOMER_BOOKING_TABS,
  getCustomerBookingTab,
  getInitialCustomerBookingTab,
} from '@/services/bookingTabs';

const RECENT_BOOKINGS_LIMIT = 5;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Awaiting Worker Acceptance', ...theme.colors.status.pending },
  ACCEPTED: { label: 'Confirmed', ...theme.colors.status.confirmed },
  WORKER_PREPARING: { label: 'Confirmed · Preparing', ...theme.colors.status.confirmed },
  WORKER_EN_ROUTE: { label: 'En Route', ...theme.colors.status.enRoute },
  WORKER_ARRIVED: { label: 'Arrived', ...theme.colors.status.progress },
  SERVICE_STARTED: { label: 'In Progress', ...theme.colors.status.progress },
  IN_PROGRESS: { label: 'In Progress', ...theme.colors.status.progress },
  PENDING_CONFIRMATION: { label: 'Awaiting Your Confirmation', ...theme.colors.status.pending },
  COMPLETED: { label: 'Completed', ...theme.colors.status.progress },
  CANCELLED: { label: 'Cancelled', ...theme.colors.status.cancelled },
};

export default function BookingsScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string | string[] }>();
  const [activeTab, setActiveTab] = useState(() =>
    getInitialCustomerBookingTab(filter),
  );
  const tabsRef = useRef<ScrollView>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setActiveTab(getInitialCustomerBookingTab(filter));
    setShowAll(false);
  }, [filter]);

  useEffect(() => {
    if (activeTab === 'Cancelled') {
      tabsRef.current?.scrollToEnd({ animated: false });
    }
  }, [activeTab]);

  const load = () =>
    void fetchBookings().then((result) => {
      if (result.error || !Array.isArray(result.data)) {
        setBookings([]);
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
            location: row.address,
            tabGroup,
            rawStatus: raw,
          };
        })
      );
    });

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
            const badge = STATUS_MAP[booking.rawStatus] ?? { label: booking.rawStatus || 'Active', color: theme.colors.primary, bg: theme.colors.infoBackground };
            return (
              <TouchableOpacity 
                key={booking.id} 
                testID="customer-booking-card"
                style={styles.bookingCard}
                onPress={() =>
                  booking.rawStatus === 'COMPLETED'
                    ? router.push(`/booking-summary/${booking.id}`)
                    : router.push(`/tracking/${booking.id}`)
                }
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={theme.typography.h4}>{booking.service}</Text>
                    <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                      Provider: {booking.provider}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[theme.typography.h4, { color: theme.colors.primary }]}>{booking.price}</Text>
                    <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <CalendarIcon color={theme.colors.textTertiary} size={14} />
                    <Text style={[theme.typography.caption, styles.detailText]}>{booking.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock color={theme.colors.textTertiary} size={14} />
                    <Text style={[theme.typography.caption, styles.detailText]}>{booking.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin color={theme.colors.textTertiary} size={14} />
                    <Text style={[theme.typography.caption, styles.detailText]} numberOfLines={1}>{booking.location}</Text>
                  </View>
                  <ChevronRight color={theme.colors.textTertiary} size={18} />
                </View>
                {booking.rawStatus === 'CANCELLED' && booking.cancellationReason ? (
                  <Text style={[theme.typography.caption, styles.cancelledReason]}>
                    Reason: {booking.cancellationReason}
                  </Text>
                ) : null}
              </TouchableOpacity>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding, alignItems: 'center' },
  tabsContainer: { marginBottom: theme.spacing.md },
  tabsScroll: { paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm, flexGrow: 1, justifyContent: 'center' },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: theme.radius.full, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
  tabButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  content: { flex: 1 },
  contentInner: { padding: theme.layout.screenPadding, paddingBottom: 88 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xxxl },
  bookingCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadows.md, borderWidth: 1, borderColor: theme.colors.borderLight },
  seeAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  seeAllText: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingTop: theme.spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailText: { color: theme.colors.textSecondary, marginLeft: 4 },
  badgeContainer: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cancelledReason: {
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
});
