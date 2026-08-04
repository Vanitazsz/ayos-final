import { styles } from './WorkerBookingsScreen.styles';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { CalendarDays, Clock, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/layout/EmptyState';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import type { useWorkerBookingsScreenController } from '../hooks/useWorkerBookingsScreenController';
import { workerBookingStatusMeta } from '../logic/WorkerBookingsScreenLogic';

const BOOKING_TABS = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];
export function WorkerBookingsView({
  model,
}: {
  model: ReturnType<typeof useWorkerBookingsScreenController>;
}) {
  const {
    activeTab,
    setActiveTab,
    loading,
    loadError,
    presenceState,
    presenceMessage,
    isCurrentlyWorking,
    load,
    accept,
    decline,
    filteredBookings,
    router,
  } = model;
  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>
      <View
        style={[
          styles.presenceStrip,
          presenceState === 'online'
            ? styles.presenceOnline
            : styles.presenceOffline,
        ]}
      >
        <Text style={styles.presenceStripText}>
          {presenceState === 'online'
            ? 'Online and receiving requests'
            : presenceMessage ||
              (
                {
                  starting: 'Starting location sharing…',
                  paused: 'Presence paused',
                  offline: 'Offline',
                  permission_denied: 'Location permission required',
                  not_ready: 'Complete worker setup',
                  error: 'Location heartbeat error',
                } as Record<string, string>
              )[presenceState]}
        </Text>
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

      {loading ? (
        <View style={styles.centerState}>
          <Text style={theme.typography.body1}>Loading bookings…</Text>
        </View>
      ) : null}
      {!loading && loadError ? (
        <View style={styles.centerState}>
          <Text style={[theme.typography.body1, { color: theme.colors.error }]}>
            {loadError}
          </Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !loadError ? (
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
              <View key={booking.id}>
                <Pressable
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
                        label={workerBookingStatusMeta(booking.status).label}
                        variant={
                          workerBookingStatusMeta(booking.status).variant
                        }
                        size="sm"
                      />
                    </View>

                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <CalendarDays
                          color={theme.colors.textTertiary}
                          size={16}
                        />
                        <Text
                          style={[theme.typography.caption, styles.detailText]}
                        >
                          {booking.date}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Clock color={theme.colors.textTertiary} size={16} />
                        <Text
                          style={[theme.typography.caption, styles.detailText]}
                        >
                          {booking.time}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MapPin color={theme.colors.textTertiary} size={16} />
                        <Text
                          style={[theme.typography.caption, styles.detailText]}
                        >
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
                          {booking.hasParts
                            ? 'Customer Has Parts'
                            : 'Needs Parts'}
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
                          <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() =>
                              router.push(
                                `/(worker)/booking-request/${booking.id}`,
                              )
                            }
                          >
                            <Text
                              style={[
                                theme.typography.caption,
                                {
                                  color: theme.colors.surface,
                                  fontWeight: '600',
                                },
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
                        {booking.status === 'pending_confirmation' && (
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
                          <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() =>
                              router.push(
                                `/(worker)/booking-request/${booking.id}`,
                              )
                            }
                          >
                            <Text
                              style={[
                                theme.typography.caption,
                                {
                                  color: theme.colors.surface,
                                  fontWeight: '600',
                                },
                              ]}
                            >
                              View
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                  {booking.status === 'pending' && (
                    <View style={styles.incomingActions}>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => decline(booking.id)}
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
                        onPress={() => void accept(booking.id)}
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
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
