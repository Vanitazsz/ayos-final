import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Edit3, Image as ImageIcon, Map as MapIcon, Check, Wallet, Banknote, CreditCard, ChevronLeft, Info } from 'lucide-react-native';
import { Colors, Layout, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { JobSummary } from '@/components/JobSummary';
import { useRequest } from '@/context/RequestContext';
import * as Location from 'expo-location';
import { reverseGeocode } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';

export default function ReviewRequestScreen() {
  const router = useRouter();
  const { request, updateRequest } = useRequest();
  const draft=useRequestStore();
  
  const [location, setLocation] = useState(request.location);
  const [isLoadingLocation, setIsLoadingLocation] = useState(!request.location);
  const [paymentMethod, setPaymentMethod] = useState('GCash');

  const PAYMENT_METHODS = [
    { id: 'GCash', icon: <Wallet size={24} color={Colors.textPrimary} strokeWidth={2} />, subtitle: '0917 •••• 1234' },
    { id: 'Credit / Debit Card', icon: <CreditCard size={24} color={Colors.textPrimary} strokeWidth={2} />, subtitle: 'Visa ending in 4242' },
    { id: 'Cash on Service', icon: <Banknote size={24} color={Colors.textPrimary} strokeWidth={2} />, subtitle: 'Pay directly to provider' }
  ];

  useEffect(() => {
    if (!request.location) {
      void (async()=>{try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('Location permission is required');const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});const details=await reverseGeocode(position.coords.latitude,position.coords.longitude);const value={latitude:position.coords.latitude,longitude:position.coords.longitude,address:details.displayLabel};setLocation(value);updateRequest({location:value});draft.setDraft({coords:{latitude:value.latitude,longitude:value.longitude},address:value.address,addressDetails:details});}finally{setIsLoadingLocation(false);}})();
    }
  }, []);

  const handleBack = () => router.back();

  const handlePostRequest = () => {
    updateRequest({ status: 'Posted' });
    draft.setDraft({ scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), matchingMode: 'direct' });
    router.push('/new-request/matching' as any);
  };

  const isASAP = request.urgency === 'ASAP';
  const getPrimaryButtonText = () => {
    if (isASAP) return 'Broadcast Request';
    return 'Post Request for Bidding';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>Review Request</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <JobSummary request={request} showEditButtons={true} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        <AppButton
          label="Edit Request Details"
          variant="outline"
          size="xl"
          fullWidth
          onPress={() => router.push('/new-request/create' as any)}
          style={{ marginBottom: Spacing['3'] }}
        />
        <AppButton
          label={getPrimaryButtonText()}
          size="xl"
          fullWidth
          onPress={handlePostRequest}
          style={{ backgroundColor: Colors.primary, borderRadius: Radius.lg }}
          labelStyle={{ color: Colors.white }}
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
    paddingBottom: 160,
  },
  section: {
    marginBottom: Spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontWeight: '700',
  },
  photoScroll: {
    gap: Spacing[3],
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    marginRight: Spacing[2],
  },
  noPhoto: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryText: {
    color: Colors.textSecondary,
    marginBottom: Spacing[4],
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: Spacing[2],
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
  mapCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
  },
  mapPlaceholder: {
    height: 140,
    width: '100%',
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    backgroundColor: Colors.surfaceCard,
    gap: Spacing[2],
  },
  addressText: {
    flex: 1,
    fontWeight: '500',
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
