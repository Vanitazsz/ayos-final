import { styles } from './TabsBookingsScreen.styles';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import {
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { EmptyState } from '@/components/layout/EmptyState';
import type { useTabsBookingsScreenController } from '../hooks/useTabsBookingsScreenController';
import { customerBookingStatusMeta } from '@/services/bookingStatus';

export function BookingsView({
  model,
}: {
  model: ReturnType<typeof useTabsBookingsScreenController>;
}) {
  const {
    router,
    activeTab,
    setActiveTab,
    showAll,
    setShowAll,
    filteredBookings,
    visibleBookings,
    CUSTOMER_BOOKING_TABS,
    RECENT_BOOKINGS_LIMIT,
  } = model;
  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {CUSTOMER_BOOKING_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
              onPress={() => {
                setActiveTab(tab);
                setShowAll(false);
              }}
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
            icon={CalendarIcon}
            title={`No ${activeTab} Bookings`}
            description={`You don't have any ${activeTab.toLowerCase()} bookings at the moment. Explore services to book a professional!`}
          />
        ) : (
          <>
            {visibleBookings.map((booking) => {
              const badge = customerBookingStatusMeta(booking.rawStatus, {
                color: theme.colors.primary,
                bg: '#E3F2FD',
              });
              return (
                <TouchableOpacity
                  key={booking.id}
                  testID="customer-booking-card"
                  style={styles.bookingCard}
                  onPress={() => router.push(`/tracking/${booking.id}`)}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={theme.typography.h4}>{booking.service}</Text>
                      <Text
                        style={[
                          theme.typography.body2,
                          { color: theme.colors.textSecondary, marginTop: 2 },
                        ]}
                      >
                        Provider: {booking.provider}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          theme.typography.h4,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {booking.price}
                      </Text>
                      <View
                        style={[
                          styles.badgeContainer,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: badge.color }]}
                        >
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailRow}>
                      <CalendarIcon
                        color={theme.colors.textTertiary}
                        size={14}
                      />
                      <Text
                        style={[theme.typography.caption, styles.detailText]}
                      >
                        {booking.date}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Clock color={theme.colors.textTertiary} size={14} />
                      <Text
                        style={[theme.typography.caption, styles.detailText]}
                      >
                        {booking.time}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MapPin color={theme.colors.textTertiary} size={14} />
                      <Text
                        style={[theme.typography.caption, styles.detailText]}
                        numberOfLines={1}
                      >
                        {booking.location}
                      </Text>
                    </View>
                    <ChevronRight color={theme.colors.textTertiary} size={18} />
                  </View>
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
