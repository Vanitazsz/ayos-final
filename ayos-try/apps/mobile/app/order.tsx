import React,{useEffect,useState}from'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, MapPin, Navigation, Tag, Wrench } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { fetchBookingDetail } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const draft=useRequestStore();const[booking,setBooking]=useState<any>(null);useEffect(()=>{if(draft.bookingId)void fetchBookingDetail(draft.bookingId).then(result=>{if(!result.error)setBooking(result.data)});},[draft.bookingId]);const request=booking?.service_requests??{};const provider={avatarUri:booking?.worker_profiles?.avatar_path??'',name:booking?.worker_profiles?.display_name??'',category:request.service_categories?.name??''};

  const handleBack = () => {
    // Return to the bookings tab
    router.replace('/(tabs)/bookings');
  };

  const handleTrack = () => {
    // Go to Live Tracking
    if(draft.bookingId)router.push(`/tracking/${draft.bookingId}`);
  };

  return (
    <View style={styles.container}>
      {/* Consistent Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>Order Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Status Alert */}
        <View style={styles.statusAlert}>
          <AppText variant="h4" weight="bold" color={Colors.white}>Service in Progress</AppText>
          <AppText variant="bodySm" color={Colors.white} style={{ opacity: 0.9 }}>
            Your provider is assigned and handling your request.
          </AppText>
        </View>

        {/* Job Summary */}
        <View style={styles.section}>
          <AppText variant="h3" weight="bold" style={styles.sectionTitle}>Job Summary</AppText>
          <View style={styles.card}>
            <View style={styles.row}>
              <Tag size={18} color={Colors.primary} />
              <AppText variant="body" weight="semiBold" style={styles.rowText}>
                {request.service_categories?.name || 'Service request'}
              </AppText>
            </View>
            <View style={[styles.row, { marginTop: Spacing[3] }]}>
              <Calendar size={18} color={Colors.primary} />
              <AppText variant="body" weight="semiBold" style={styles.rowText}>
                {request.scheduled_at?new Date(request.scheduled_at).toLocaleString():'Schedule unavailable'}
              </AppText>
            </View>
            <View style={styles.divider} />
            <AppText variant="body" color={Colors.textSecondary}>
              {request.description || 'No description provided.'}
            </AppText>
          </View>
        </View>

        {/* Replacement Parts */}
        {request.notes && (
          <View style={styles.section}>
            <AppText variant="h3" weight="bold" style={styles.sectionTitle}>Replacement Parts</AppText>
            <View style={styles.card}>
              <View style={styles.row}>
                <Wrench size={18} color={Colors.warning} />
                <AppText variant="body" weight="semiBold" style={[styles.rowText, { color: Colors.warning }]}> 
                  Request notes
                </AppText>
              </View>
              {request.notes ? (
                <AppText variant="body" color={Colors.textSecondary} style={{ marginTop: Spacing[2] }}>
                  {request.notes}
                </AppText>
              ) : null}
            </View>
          </View>
        )}

        {/* Provider Details */}
        <View style={styles.section}>
          <AppText variant="h3" weight="bold" style={styles.sectionTitle}>Assigned Provider</AppText>
          <View style={styles.card}>
            <View style={styles.providerRow}>
              <Avatar uri={provider.avatarUri} size={56} />
              <View style={styles.providerInfo}>
                <AppText variant="h4" weight="bold">{provider.name}</AppText>
                <AppText variant="bodySm" color={Colors.textSecondary}>{provider.category}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Price & Payment */}
        <View style={styles.section}>
          <AppText variant="h3" weight="bold" style={styles.sectionTitle}>Payment</AppText>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <AppText variant="body">Total Amount</AppText>
              <AppText variant="h3" weight="bold" color={Colors.cta}>₱{Number(request.budget??0).toLocaleString()}</AppText>
            </View>
            <AppText variant="caption" color={Colors.success} style={{ textAlign: 'right', marginTop: 4 }}>
              {booking?.status==='COMPLETED'?'Ready for cash confirmation':'Cash due after completion'}
            </AppText>
          </View>
        </View>

      </ScrollView>

      {/* Floating CTA */}
      <View style={styles.footer}>
        <AppButton 
          label="View Live Tracking" 
          size="xl"
          fullWidth
          onPress={handleTrack}
          leftIcon={<Navigation size={20} color={Colors.white} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 60,
    paddingBottom: Spacing[4],
    backgroundColor: Colors.background,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: 120,
  },
  statusAlert: {
    backgroundColor: Colors.primary,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    marginBottom: Spacing[6],
  },
  section: {
    marginBottom: Spacing[6],
  },
  sectionTitle: {
    marginBottom: Spacing[3],
  },
  card: {
    backgroundColor: Colors.white,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    marginLeft: Spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[4],
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    marginLeft: Spacing[4],
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
