import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Clock3, MapPin, MessageCircle, ReceiptText, RotateCcw } from 'lucide-react-native';
import {
  CustomerEmptyState,
  CustomerPage,
  PageHeader,
  PrimaryButton,
  StatusPill,
  SurfaceCard,
  customerColors,
} from '@/components/customer/CustomerUI';
import { fetchBookings, subscribeToTable } from '@/services/api';

const tabs = ['Upcoming', 'Ongoing', 'Completed'] as const;
type Tab = (typeof tabs)[number];

function toTab(status: string): Tab | 'Cancelled' {
  if (status === 'completed') return 'Completed';
  if (status === 'ongoing') return 'Ongoing';
  if (status === 'cancelled') return 'Cancelled';
  return 'Upcoming';
}

export default function BookingsScreen() {
  const router = useRouter();
  const [active, setActive] = useState<Tab>('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () =>
      void fetchBookings().then((result) => {
        setBookings(result.data);
        setError(result.error ?? '');
        setLoading(false);
      });
    load();
    return subscribeToTable('bookings', load);
  }, []);

  const filtered = useMemo(
    () => bookings.filter((booking) => toTab(booking.status) === active),
    [active, bookings],
  );

  return (
    <CustomerPage scroll={false} testID="customer-bookings">
      <PageHeader title="My Bookings" subtitle="Track and manage your home services" />
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === tab }}
            onPress={() => setActive(tab)}
            style={styles.tab}
          >
            <Text style={[styles.tabText, active === tab && styles.tabTextActive]}>{tab}</Text>
            <View style={[styles.tabLine, active === tab && styles.tabLineActive]} />
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={customerColors.primary} /></View>
      ) : filtered.length === 0 ? (
        <CustomerEmptyState
          icon={CalendarDays}
          title={error ? 'Bookings unavailable' : `No ${active.toLowerCase()} bookings yet`}
          description={error || (active === 'Completed'
            ? 'Completed services and receipts will appear here.'
            : 'Book a service to see it here.')}
          actionLabel={active !== 'Completed' ? 'Book a service' : undefined}
          onAction={() => router.push('/new-request/create')}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {filtered.map((booking) => {
            const ongoing = active === 'Ongoing';
            const completed = active === 'Completed';
            return (
              <Pressable key={booking.id} onPress={() => router.push(`/booking/${booking.id}` as any)}>
                <SurfaceCard style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.serviceIcon}><Text style={styles.serviceInitial}>{booking.category?.charAt(0) || 'A'}</Text></View>
                    <View style={styles.cardCopy}>
                      <Text style={styles.serviceTitle}>{booking.category}</Text>
                      <Text style={styles.provider}>Provider: {booking.providerName}</Text>
                    </View>
                    <StatusPill
                      label={completed ? 'Completed' : ongoing ? 'In progress' : 'Confirmed'}
                      tone={completed ? 'success' : ongoing ? 'warning' : 'info'}
                    />
                  </View>
                  <View style={styles.details}>
                    <View style={styles.detail}><CalendarDays size={16} color={customerColors.muted} /><Text style={styles.detailText}>{booking.date}</Text></View>
                    <View style={styles.detail}><Clock3 size={16} color={customerColors.muted} /><Text style={styles.detailText}>{booking.time}</Text></View>
                    <View style={styles.detail}><MapPin size={16} color={customerColors.muted} /><Text style={styles.detailText} numberOfLines={1}>{booking.address || 'Service address'}</Text></View>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Estimated total</Text>
                    <Text style={styles.price}>{booking.price}</Text>
                  </View>
                  <View style={styles.actions}>
                    {completed ? (
                      <>
                        <Pressable style={styles.secondaryAction} onPress={() => router.push(`/review/${booking.id}` as any)}><Text style={styles.secondaryActionText}>Rate worker</Text></Pressable>
                        <Pressable style={styles.iconAction} onPress={() => router.push('/new-request/create')}><RotateCcw size={18} color={customerColors.primary} /></Pressable>
                        <Pressable style={styles.iconAction} onPress={() => router.push(`/payment/${booking.id}` as any)}><ReceiptText size={18} color={customerColors.primary} /></Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.primaryAction}>
                          <PrimaryButton
                            label={ongoing ? 'Track status' : 'View booking'}
                            onPress={() => router.push(ongoing ? `/tracking/${booking.id}` as any : `/booking/${booking.id}` as any)}
                          />
                        </View>
                        <Pressable style={styles.iconAction} onPress={() => router.push(`/messages/chat?id=${booking.id}` as any)}><MessageCircle size={19} color={customerColors.primary} /></Pressable>
                      </>
                    )}
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </CustomerPage>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: customerColors.border, marginHorizontal: -20, paddingHorizontal: 20 },
  tab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'flex-end' },
  tabText: { color: customerColors.muted, fontSize: 14, fontWeight: '600', paddingBottom: 12 },
  tabTextActive: { color: customerColors.primary },
  tabLine: { height: 3, width: '70%', borderRadius: 2, backgroundColor: 'transparent' },
  tabLineActive: { backgroundColor: customerColors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 18, paddingBottom: 22, gap: 14 },
  card: { padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: customerColors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  serviceInitial: { color: customerColors.primary, fontSize: 18, fontWeight: '800' },
  cardCopy: { flex: 1 },
  serviceTitle: { color: customerColors.text, fontSize: 16, fontWeight: '700' },
  provider: { color: customerColors.muted, fontSize: 12, marginTop: 3 },
  details: { gap: 8, borderTopWidth: 1, borderTopColor: customerColors.border, marginTop: 14, paddingTop: 13 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { flex: 1, color: customerColors.muted, fontSize: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  priceLabel: { flex: 1, color: customerColors.muted, fontSize: 12 },
  price: { color: customerColors.text, fontSize: 17, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 15 },
  primaryAction: { flex: 1 },
  secondaryAction: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: customerColors.primary, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: customerColors.surface, fontSize: 14, fontWeight: '700' },
  iconAction: { width: 48, height: 48, borderRadius: 15, backgroundColor: customerColors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
