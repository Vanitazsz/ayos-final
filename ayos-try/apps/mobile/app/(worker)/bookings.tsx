import React, { useState, useMemo, useEffect } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { CalendarDays, Clock, MapPin } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import {
  acceptJob,
  cancelBooking,
  fetchWorkerBookings,
  subscribeToTable,
} from '@/services/api';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import type { WorkerBooking } from '@/services/api';

const statusConfig: Record<string, { label: string; variant: string }> = {
  hired: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'info' },
  worker_preparing: { label: 'Preparing', variant: 'info' },
  worker_en_route: { label: 'En Route', variant: 'info' },
  worker_arrived: { label: 'Arrived', variant: 'info' },
  service_started: { label: 'Started', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  pending: { label: 'Pending', variant: 'warning' },
};

const BOOKING_TABS = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];

const TAB_FILTERS: Record<string, WorkerBooking['status'][]> = {
  Upcoming: ['pending', 'hired', 'accepted', 'worker_preparing'],
  'In Progress': [
    'worker_en_route',
    'worker_arrived',
    'service_started',
    'in_progress',
  ],
  Completed: ['completed'],
  Cancelled: ['cancelled'],
};

export default function WorkerBookingsScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [activeTab, setActiveTab] = useState(
    filter === 'Cancelled' ? 'Cancelled' : 'Upcoming',
  );
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const isCurrentlyWorking = useWorkerBookingStore((s) => s.isCurrentlyWorking);
  const load = () =>
    void fetchWorkerBookings().then((result) => setBookings(result.data));
  useEffect(() => {
    load();
    return subscribeToTable('bookings', load);
  }, []);
  const accept = async (id: string) => {
    try {
      await acceptJob(id);
      load();
    } catch (error) {
      Alert.alert(
        'Unable to accept',
        error instanceof Error ? error.message : 'Please retry.',
      );
    }
  };
  const decline = (id: string) =>
    Alert.alert('Decline booking', 'Decline this incoming request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () =>
          void cancelBooking(id, 'Worker declined the assigned booking')
            .then(load)
            .catch((error) => Alert.alert('Unable to decline', error.message)),
      },
    ]);

  const filteredBookings = useMemo(() => {
    const statuses = TAB_FILTERS[activeTab] || [];
    return bookings.filter((b) => statuses.includes(b.status));
  }, [activeTab, bookings]);

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>

      {isCurrentlyWorking && (
        <View style={styles.workingBanner}>
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.surface, fontWeight: '600' },
            ]}
          >
            You are currently working on a job
          </Text>
        </View>
      )}

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {BOOKING_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  theme.typography.button,
                  {
                    color:
                      activeTab === tab
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={`No ${activeTab} Bookings`}
            description={`You don't have any ${activeTab.toLowerCase()} bookings at the moment.`}
          />
        ) : (
          filteredBookings.map((booking) => (
            <Pressable
              key={booking.id}
              style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
              onPress={() =>
                router.push(`/(worker)/booking-request/${booking.id}`)
              }
            >
              <View style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.customerRow}>
                    <Avatar uri={booking.customerAvatar} size={40} />
                    <View>
                      <Text style={theme.typography.h4}>
                        {booking.customerName}
                      </Text>
                      <Text
                        style={[
                          theme.typography.body2,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {booking.service}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    label={
                      (
                        statusConfig[booking.status] ?? {
                          label: booking.status,
                        }
                      ).label
                    }
                    variant={
                      (statusConfig[booking.status] ?? { variant: 'info' })
                        .variant as any
                    }
                    size="sm"
                  />
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <CalendarDays color={theme.colors.textTertiary} size={16} />
                    <Text style={[theme.typography.caption, styles.detailText]}>
                      {booking.date}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock color={theme.colors.textTertiary} size={16} />
                    <Text style={[theme.typography.caption, styles.detailText]}>
                      {booking.time}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin color={theme.colors.textTertiary} size={16} />
                    <Text style={[theme.typography.caption, styles.detailText]}>
                      {booking.address}
                    </Text>
                  </View>
                </View>

                {booking.hasParts !== undefined && (
                  <View
                    style={[
                      styles.partsRow,
                      {
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        theme.typography.caption,
                        {
                          color: booking.hasParts
                            ? theme.colors.success
                            : theme.colors.warning,
                          fontWeight: '500',
                        },
                      ]}
                    >
                      {booking.hasParts ? 'Customer Has Parts' : 'Needs Parts'}
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Text
                    style={[
                      theme.typography.h4,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {booking.price}
                  </Text>
                  <View style={styles.actionRow}>
                    {booking.status === 'in_progress' && (
                      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}>
                        <Text
                          style={[
                            theme.typography.caption,
                            { color: theme.colors.surface, fontWeight: '600' },
                          ]}
                        >
                          {isCurrentlyWorking ? 'Working...' : 'View'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'completed' && (
                      <Text
                        style={[
                          theme.typography.caption,
                          { color: theme.colors.textTertiary },
                        ]}
                      >
                        Paid · {booking.price}
                      </Text>
                    )}
                    {booking.status === 'pending_review' && (
                      <Text
                        style={[
                          theme.typography.caption,
                          { color: theme.colors.warning },
                        ]}
                      >
                        Awaiting confirmation
                      </Text>
                    )}
                    {(booking.status === 'hired' ||
                      booking.status === 'accepted' ||
                      booking.status === 'en_route') && (
                      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push(`/(worker)/booking-request/${booking.id}`)}>
                        <Text
                          style={[
                            theme.typography.caption,
                            { color: theme.colors.surface, fontWeight: '600' },
                          ]}
                        >
                          View
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {booking.status === 'pending' && (
                  <View style={styles.incomingActions}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        decline(booking.id);
                      }}
                    >
                      <Text
                        style={[
                          theme.typography.button,
                          { color: theme.colors.error },
                        ]}
                      >
                        Decline
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        void accept(booking.id);
                      }}
                    >
                      <Text
                        style={[
                          theme.typography.button,
                          { color: theme.colors.surface },
                        ]}
                      >
                        Accept
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  workingBanner: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.layout.screenPadding,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabsScroll: { paddingHorizontal: theme.layout.screenPadding },
  tabButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  content: { flex: 1 },
  contentInner: {
    paddingHorizontal: theme.layout.screenPadding,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailText: { color: theme.colors.textSecondary, marginLeft: 4 },
  partsRow: { paddingTop: theme.spacing.sm, marginTop: theme.spacing.sm },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  declineBtn: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  acceptBtn: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
  },
});
