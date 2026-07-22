import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Calendar as CalendarIcon, Clock } from 'lucide-react-native';

import { EmptyState } from '@/components/layout/EmptyState';
import { fetchBookings, subscribeToTable } from '@/services/api';

const BOOKING_TABS = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Ongoing');
  const [bookings,setBookings]=useState<any[]>([]);
  useEffect(()=>{
    const load=()=>void fetchBookings().then(result=>setBookings(result.data.map(row=>({
      ...row,service:row.category,provider:row.providerName,location:row.address,
      status:row.status==='completed'?'Completed':row.status==='cancelled'?'Cancelled':row.status==='upcoming'?'Upcoming':'Ongoing',
    }))));
    load();
    return subscribeToTable('bookings',load);
  },[]);

  const filteredBookings = bookings.filter(b => b.status === activeTab);

  return (
    <Screen safeArea backgroundColor={theme.colors.background}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>My Bookings</Text>
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {BOOKING_TABS.map(tab => (
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
          filteredBookings.map(booking => (
            <TouchableOpacity 
              key={booking.id} 
              style={styles.bookingCard}
              onPress={() => {
                if (booking.status === 'Ongoing') {
                  router.push(`/tracking/${booking.id}`);
                }
              }}
            >
              <View style={styles.cardHeader}>
                <Text style={theme.typography.h4}>{booking.service}</Text>
                <Text style={[theme.typography.label, { color: theme.colors.primary }]}>{booking.price}</Text>
              </View>
              
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginBottom: theme.spacing.md }]}>
                Provider: {booking.provider}
              </Text>

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
                  <Text style={[theme.typography.caption, styles.detailText]}>{booking.location}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
});
