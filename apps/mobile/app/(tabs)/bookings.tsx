import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { fetchBookings, subscribeToTable } from '@/services/api';

const BOOKING_TABS = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending Acceptance', color: '#B78103', bg: '#FFF8E1' },
  ACCEPTED: { label: 'Accepted', color: '#0277BD', bg: '#E1F5FE' },
  WORKER_PREPARING: { label: 'Preparing', color: '#0277BD', bg: '#E1F5FE' },
  WORKER_EN_ROUTE: { label: 'En Route 🚚', color: '#1565C0', bg: '#E8EAF6' },
  WORKER_ARRIVED: { label: 'Arrived 📍', color: '#2E7D32', bg: '#E8F5E9' },
  SERVICE_STARTED: { label: 'In Progress 🛠️', color: '#2E7D32', bg: '#E8F5E9' },
  IN_PROGRESS: { label: 'In Progress 🛠️', color: '#2E7D32', bg: '#E8F5E9' },
  COMPLETED: { label: 'Completed ✅', color: '#2E7D32', bg: '#E8F5E9' },
  CANCELLED: { label: 'Cancelled ❌', color: '#C62828', bg: '#FFEBEE' },
};

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);

  const load = () =>
    void fetchBookings().then((result) => {
      if (result.error || !Array.isArray(result.data)) {
        setBookings([]);
        return;
      }
      setBookings(
        result.data.map((row) => {
          const raw = String(row.rawStatus || row.status || '').toUpperCase();
          let tabGroup = 'Upcoming';
          if (raw === 'COMPLETED' || row.status === 'completed') {
            tabGroup = 'Completed';
          } else if (raw === 'CANCELLED' || row.status === 'cancelled') {
            tabGroup = 'Cancelled';
          } else if (['WORKER_EN_ROUTE', 'WORKER_ARRIVED', 'SERVICE_STARTED', 'IN_PROGRESS'].includes(raw) || row.status === 'ongoing') {
            tabGroup = 'Ongoing';
          } else {
            tabGroup = 'Upcoming';
          }

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
    load();
    return subscribeToTable('bookings', load);
  }, []);

  const filteredBookings = bookings.filter((b) => b.tabGroup === activeTab);

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {BOOKING_TABS.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[theme.typography.button, { color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary }]}>
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
          filteredBookings.map((booking) => {
            const badge = STATUS_MAP[booking.rawStatus] ?? { label: booking.rawStatus || 'Active', color: theme.colors.primary, bg: '#E3F2FD' };
            return (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.bookingCard}
                onPress={() => router.push(`/tracking/${booking.id}`)}
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
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.layout.screenPadding },
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabsScroll: { paddingHorizontal: theme.layout.screenPadding },
  tabButton: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, marginRight: theme.spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  content: { flex: 1 },
  contentInner: { padding: theme.layout.screenPadding },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.xxxl },
  bookingCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  cardDetails: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingTop: theme.spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailText: { color: theme.colors.textSecondary, marginLeft: 4 },
  badgeContainer: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
