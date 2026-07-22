import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Layout, Spacing, Radius, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { JobSummary } from '@/components/JobSummary';
import { useRequest } from '@/context/RequestContext';
import { ChevronLeft } from 'lucide-react-native';
import { useRequestStore } from '@/store/useRequestStore';

export default function OpenBiddingReviewScreen() {
  const router = useRouter();
  const { request, updateRequest } = useRequest();
  const setDraft = useRequestStore((state) => state.setDraft);

  const handlePostRequest = () => {
    updateRequest({ status: 'Posted' });
    setDraft({ matchingMode: 'bidding', scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
    router.push('/new-request/matching' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>Review Bidding Request</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <JobSummary request={request} showEditButtons={true} />
      </ScrollView>

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
          label="Post Request for Bidding"
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPadding, paddingTop: 60, paddingBottom: Spacing[4], backgroundColor: Colors.background },
  headerTitle: { flex: 1, textAlign: 'center' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContent: { padding: Layout.screenPadding, paddingBottom: 160 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surfaceCard, padding: Layout.screenPadding, paddingBottom: 40, borderTopWidth: 1, borderTopColor: Colors.border, ...Elevation.md },
});
