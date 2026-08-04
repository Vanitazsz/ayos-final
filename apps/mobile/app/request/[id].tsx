import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ChevronLeft, CheckCircle, Clock3, MessageSquare } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Layout, Spacing, Radius, Elevation } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { JobSummary } from '@/components/JobSummary';
import { ProviderCard } from '@/components/ProviderCard';
import { useRequest } from '@/context/RequestContext';
import { fetchProviderProfile, fetchRequest, fetchBookingByRequestId } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';

export default function RequestDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request,updateRequest } = useRequest();
  const setDraft=useRequestStore(state=>state.setDraft);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if(!id)return;const load=async()=>{setIsLoading(true);const requestResult=await fetchRequest(id);if(requestResult.error){setIsLoading(false);return;}const row=requestResult.data;updateRequest({description:row.description,category:row.service_categories?.name??'',location:{latitude:Number(row.addresses?.latitude),longitude:Number(row.addresses?.longitude),address:[row.addresses?.line1,row.addresses?.barangay,row.addresses?.city].filter(Boolean).join(', ')},status:row.status==='CLOSED'?'Completed':row.status==='BOOKED'?'Accepted':'Posted'});setDraft({requestId:id});fetchBookingByRequestId(id).then(r=>{if(r.data?.id)setBookingId(r.data.id);});const mapped=[];for(const candidate of row.match_candidates??[]){const profile=await fetchProviderProfile(candidate.worker_id);if(!profile.error)mapped.push({...profile.data,estimatedPrice:'',eta:candidate.factors?.distance_meters?`${(Number(candidate.factors.distance_meters)/1000).toFixed(1)} km`:''});}setApplicants(mapped);setIsLoading(false);};void load();
  }, [id]);

  const handleBack = () => router.back();

  const assignedWorker = applicants.find(row=>row.id===request.selectedWorkerId)??null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>Request Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Highlighted Job Summary at the top */}
        <View style={[styles.section, styles.highlightBox]}>
          <AppText variant="h3" weight="bold" style={[styles.sectionTitle, { marginBottom: Spacing['3'] }]}>Request Summary</AppText>
          <JobSummary request={request} showEditButtons={request.status === 'Draft' || request.status === 'Posted'} compact={true} />
        </View>

        {/* Dynamic State Rendering */}
        {request.status === 'Posted' ? (
          <View style={styles.section}>
            <View style={styles.statusAlert}>
              <AppText variant="h4" weight="bold" color={Colors.white}>
                Waiting for Workers
              </AppText>
              <AppText variant="caption" color={Colors.white} style={{ opacity: 0.9, marginTop: 4 }}>
                Your request is posted. Workers are reviewing it.
              </AppText>
            </View>

            <AppText variant="h3" weight="bold" style={styles.sectionTitle}>
              Applicants ({applicants.length})
            </AppText>
            
            {isLoading ? (
              <View style={styles.emptyState}>
                <Clock3 size={40} color={Colors.textTertiary} strokeWidth={1.5} />
                <AppText variant="body" weight="semiBold" style={{ marginTop: Spacing['3'] }}>Waiting for applicants...</AppText>
                <AppText variant="caption" color={Colors.textSecondary} align="center" style={{ marginTop: Spacing['1'] }}>
                  Nearby verified workers will appear here once they apply.
                </AppText>
              </View>
            ) : (
              applicants.map((applicant) => (
                <View key={applicant.id} style={styles.applicantCard}>
                  <View style={styles.applicantHeader}>
                    <Avatar uri={applicant.avatarUri} size={50} />
                    <View style={styles.applicantInfo}>
                      <View style={styles.nameRow}>
                        <AppText variant="body" weight="bold">{applicant.name}</AppText>
                        {applicant.verified && <CheckCircle size={14} color={Colors.verified} strokeWidth={2.5} style={{ marginLeft: 4 }} />}
                      </View>
                      <View style={styles.statsRow}>
                        <Badge label={`${applicant.rating} ★`} variant="warning" />
                        <AppText variant="caption" color={Colors.textSecondary}>• {applicant.reviewCount} jobs</AppText>
                      </View>
                    </View>
                    <View style={styles.priceContainer}>
                      <AppText variant="h3" weight="bold" color={Colors.cta}>{applicant.estimatedPrice}</AppText>
                      <AppText variant="caption" color={Colors.textSecondary}>{applicant.eta}</AppText>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <AppButton 
                      label="View Profile" 
                      variant="outline" 
                      size="sm" 
                      style={styles.actionBtn} 
                      onPress={() => router.push(`/provider/${applicant.id}?isApplicant=true` as any)}
                    />
                    <AppButton 
                      label="Message" 
                      size="sm" 
                      style={styles.actionBtn} 
                      onPress={() => router.push(`/chat/${applicant.id}` as any)}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        ) : assignedWorker ? (
          <View style={styles.section}>
            <AppText variant="h3" weight="bold" style={styles.sectionTitle}>Assigned Worker</AppText>
            <ProviderCard provider={assignedWorker} onPress={() => router.push(`/provider/${assignedWorker.id}` as any)} />
            
            <View style={styles.actionRow}>
              <AppButton 
                label="Message Worker" 
                variant="outline"
                style={[styles.actionBtn, { marginTop: Spacing['3'] }]} 
                leftIcon={<MessageSquare size={18} color={Colors.primary} />}
                onPress={() => router.push(`/chat/${assignedWorker.id}` as any)}
              />
              {request.status === 'Completed' && (
                <AppButton 
                  label="Leave Review" 
                  style={[styles.actionBtn, { marginTop: Spacing['3'] }]} 
                  onPress={() => bookingId && router.push(`/review/${bookingId}` as any)}
                />
              )}
              {request.status === 'Accepted' && (
                <AppButton 
                  label="Proceed to Payment" 
                  style={[styles.actionBtn, { marginTop: Spacing['3'] }]} 
                  onPress={() => bookingId && router.push(`/payment/${bookingId}` as any)}
                />
              )}
            </View>
          </View>
        ) : null}

      </ScrollView>
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
    paddingBottom: Spacing['4'],
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: 60,
  },
  section: {
    marginBottom: Spacing['6'],
  },
  highlightBox: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Elevation.sm,
  },
  sectionTitle: {
    marginBottom: Spacing['3'],
  },
  statusAlert: {
    backgroundColor: Colors.warning,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    marginBottom: Spacing['4'],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['6'],
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  applicantCard: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing['4'],
    borderRadius: Radius.lg,
    marginBottom: Spacing['3'],
    ...Elevation.sm,
  },
  applicantHeader: {
    flexDirection: 'row',
    marginBottom: Spacing['3'],
  },
  applicantInfo: {
    flex: 1,
    marginLeft: Spacing['3'],
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  priceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  actionBtn: {
    flex: 1,
  },
});
