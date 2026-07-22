import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { ChevronLeft, CreditCard, Wallet, Banknote, Check, Info, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Radius, Spacing, Elevation, Typography, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { fetchBookingDetail } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';

export default function PaymentScreen() {
  const draft=useRequestStore();
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [booking,setBooking]=useState<any>(null);const selectedWorker={avatarUri:booking?.worker_profiles?.avatar_path??'',name:booking?.worker_profiles?.display_name??'',category:booking?.service_requests?.service_categories?.name??'',price:booking?`₱${Number(booking.service_requests?.budget).toLocaleString()}`:''};
  useEffect(()=>{if(draft.bookingId)void fetchBookingDetail(draft.bookingId).then(result=>{if(!result.error)setBooking(result.data)});},[draft.bookingId]);

  const handleBack = useCallback(() => router.back(), []);
  const handlePay = useCallback(() => {
    if(!draft.bookingId)return;
    router.dismissAll();
    router.replace(`/tracking/${draft.bookingId}`);
  }, [draft.bookingId]);

  // Using a more generalized icon getter that maps to the new visuals
  const getMethodIcon = (type: string) => {
    if (type === 'Apple Pay' || type.toLowerCase().includes('gcash')) return <Wallet size={24} color={Colors.textPrimary} strokeWidth={2} />;
    if (type.toLowerCase().includes('cash')) return <Banknote size={24} color={Colors.textPrimary} strokeWidth={2} />;
    return <CreditCard size={24} color={Colors.textPrimary} strokeWidth={2} />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>Confirm Booking</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Booking Details Card */}
        <View style={styles.section}>
          <View style={styles.bookingCard}>
            <View style={styles.bookingCardHeader}>
              <View style={styles.bookingCardInfo}>
                <AppText variant="h4" weight="bold" style={{ marginBottom: 4 }}>{selectedWorker.category}</AppText>
                <View style={styles.dateRow}>
                  <Avatar uri={selectedWorker.avatarUri} size={24} />
                  <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginLeft: 8 }}>
                    {selectedWorker.name}
                  </AppText>
                </View>
              </View>
              <Image 
                source={{ uri: selectedWorker.avatarUri }} 
                style={styles.serviceImage} 
              />
            </View>
            
            <View style={styles.summaryRow}>
              <AppText variant="body" color={Colors.textSecondary}>Service estimate</AppText>
              <AppText variant="body" weight="semiBold">{selectedWorker.price}</AppText>
            </View>
            <View style={[styles.summaryRow, { marginTop: Spacing['2'] }]}>
              <AppText variant="body" color={Colors.textSecondary}>Payment timing</AppText>
              <AppText variant="body" weight="semiBold">After completion</AppText>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <AppText variant="h4" weight="bold">Total</AppText>
              <AppText variant="h3" weight="bold" color={Colors.textPrimary}>{selectedWorker.price}</AppText>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <AppText variant="h4" weight="bold" style={{ marginBottom: Spacing['3'] }}>Payment Method</AppText>
          <View style={styles.methodsList}>
            {/* Online methods remain disabled until their providers are configured. */}
            
            <Pressable
              disabled
              style={[
                styles.methodCard,
                { borderColor: selectedMethod === 'gcash' ? Colors.textPrimary : Colors.border },
              ]}
            >
              <View style={styles.methodIcon}><Wallet size={24} color={Colors.textPrimary} strokeWidth={2} /></View>
              <View style={styles.methodInfo}>
                <AppText variant="body" weight="semiBold">GCash</AppText>
                <AppText variant="caption" color={Colors.textSecondary}>Unavailable</AppText>
              </View>
              {selectedMethod === 'gcash' ? (
                <View style={styles.selectedCircle}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>

            <Pressable
              disabled
              style={[
                styles.methodCard,
                { borderColor: selectedMethod === 'visa' ? Colors.textPrimary : Colors.border },
              ]}
            >
              <View style={styles.methodIcon}><CreditCard size={24} color={Colors.textPrimary} strokeWidth={2} /></View>
              <View style={styles.methodInfo}>
                <AppText variant="body" weight="semiBold">Credit / Debit Card</AppText>
                <AppText variant="caption" color={Colors.textSecondary}>Unavailable</AppText>
              </View>
              {selectedMethod === 'visa' ? (
                <View style={styles.selectedCircle}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setSelectedMethod('cash')}
              style={[
                styles.methodCard,
                { borderColor: selectedMethod === 'cash' ? Colors.textPrimary : Colors.border },
              ]}
            >
              <View style={styles.methodIcon}><Banknote size={24} color={Colors.textPrimary} strokeWidth={2} /></View>
              <View style={styles.methodInfo}>
                <AppText variant="body" weight="semiBold">Cash on Service</AppText>
                <AppText variant="caption" color={Colors.textSecondary}>Pay directly to provider</AppText>
              </View>
              {selectedMethod === 'cash' ? (
                <View style={styles.selectedCircle}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>

          </View>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        {/* Security Note */}
        <View style={styles.securityNote}>
          <Info size={20} color={Colors.success} strokeWidth={2} />
          <AppText variant="bodySm" color={Colors.success} style={{ flex: 1 }}>
            Online payment will be held and only released after the job is completed.
          </AppText>
        </View>
        
        <AppButton
          label="Continue with Cash on Service"
          size="xl"
          fullWidth
          onPress={handlePay}
          style={{ backgroundColor: Colors.textPrimary, borderRadius: Radius.lg }}
          labelStyle={{ color: Colors.white }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  section: { paddingHorizontal: Spacing['4'], marginBottom: Spacing['6'] },
  
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 5,
    borderTopColor: Colors.primary,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing['4'],
  },
  bookingCardInfo: {
    flex: 1,
    paddingRight: Spacing['2'],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  summaryRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  summaryDivider: { 
    height: 1, 
    backgroundColor: Colors.border, 
    marginVertical: Spacing['4'] 
  },

  methodsList: { gap: Spacing['3'] },
  methodCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing['4'], borderWidth: 1, gap: Spacing['3'],
  },
  methodIcon: {
    width: 40, height: 40, borderRadius: Radius.sm,
    backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center',
  },
  methodInfo: { flex: 1 },
  selectedCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  unselectedCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.textTertiary,
  },

  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent', 
    paddingHorizontal: Spacing['4'], paddingBottom: Spacing['6'],
  },
  securityNote: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.successBg,
    padding: Spacing['3'],
    borderRadius: Radius.md,
    gap: Spacing['2'], 
    marginBottom: Spacing['4'],
  },
});
