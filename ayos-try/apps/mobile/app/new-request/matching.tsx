import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { ArrowLeft, MapPin, Star, MessageSquare, AlertCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { attachRequestMedia, generateMatches, publishServiceRequest, fetchRequest, selectWorker } from '@/services/api';
import { useRequestStore } from '@/store/useRequestStore';

export default function MatchingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [matchState, setMatchState] = useState<'searching' | 'results' | 'no_workers' | 'declined'>('searching');
  const [pulseAnim] = useState(new Animated.Value(1));
  const [retryCount, setRetryCount] = useState(0);
  const [workers,setWorkers]=useState<any[]>([]);
  const draft=useRequestStore();

  useEffect(() => {
    if (matchState === 'searching') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();

      let active=true;
      void (async()=>{try{if(!draft.coords)throw new Error('A confirmed service location is required');if(!draft.categoryId)throw new Error('A service category is required');let requestId=draft.requestId;if(!requestId){const scheduledAt=draft.scheduledAt??new Date(Date.now()+(draft.aiResult?.urgency==='emergency'?5:30)*60000).toISOString();const created=await publishServiceRequest({categoryId:draft.categoryId,description:draft.aiResult?.requestDraft??draft.description,addressId:draft.addressId,address:draft.address,addressDetails:draft.addressDetails,latitude:draft.coords.latitude,longitude:draft.coords.longitude,scheduledAt,budgetMinor:draft.aiResult?.estimatedCostMinimumMinor??draft.budgetMinor,analysisId:draft.aiResult?.analysisId??null});requestId=created.id;draft.setDraft({requestId});}const activeRequestId=requestId as string;if(draft.media.length)await attachRequestMedia(activeRequestId,draft.media);if(draft.matchingMode==='bidding'||draft.aiResult?.safetyCritical){if(active){router.replace(`/request/${activeRequestId}` as any);}return;}await generateMatches(activeRequestId);const request=await fetchRequest(activeRequestId);if(!active)return;const rows=(request.data?.match_candidates??[]).map((candidate:any)=>({id:candidate.worker_id,name:candidate.worker_profiles?.display_name??'',skill:candidate.worker_profiles?.worker_skills?.[0]?.service_categories?.name??'',rating:Number(candidate.factors?.rating??0),distance:candidate.factors?.distance_meters?`${(Number(candidate.factors.distance_meters)/1000).toFixed(1)}km`:'',confidence:Math.min(100,Math.round(Number(candidate.score))),price:`₱${((draft.aiResult?.estimatedCostMinimumMinor??draft.budgetMinor)/100).toLocaleString()} estimate`,avatar:candidate.worker_profiles?.avatar_path??''}));setWorkers(rows);setMatchState(rows.length?'results':'no_workers');}catch(error){if(active){Alert.alert('Matching unavailable',error instanceof Error?error.message:'Please try again.');setMatchState('no_workers');}}})();
      return () => {active=false;pulseAnim.stopAnimation();};
    }
  }, [matchState, pulseAnim, retryCount]);

  const handleHire = async (workerId: string) => {
    if(!draft.requestId)return;
    try{const booking=await selectWorker(draft.requestId,workerId);router.push(`/tracking/${booking.id}`);}catch(error){Alert.alert('Worker unavailable',error instanceof Error?error.message:'Select another worker.');await retry();}
  };
  const retry=async()=>{setRetryCount((value)=>value+1);setMatchState('searching');};

  const renderNoWorkers = () => (
    <View style={styles.errorContainer}>
      <AlertCircle color={theme.colors.error} size={64} style={{ marginBottom: theme.spacing.lg }} />
      <Text style={[theme.typography.h3, { marginBottom: theme.spacing.md }]}>No Workers Available</Text>
      <Text style={[theme.typography.body1, { textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.xxxl }]}>
        All nearby professionals are currently busy. Would you like to expand the search radius or try scheduling for later?
      </Text>
      <Button 
        title="Retry Search" 
        onPress={()=>void retry()} 
        style={{ marginBottom: theme.spacing.md }} 
        fullWidth
      />
      <Button 
        title="Schedule for Later" 
        variant="outlined"
        onPress={() => router.back()} 
        fullWidth
      />
    </View>
  );

  const renderDeclined = () => (
    <View style={styles.errorContainer}>
      <AlertCircle color={theme.colors.warning} size={64} style={{ marginBottom: theme.spacing.lg }} />
      <Text style={[theme.typography.h3, { marginBottom: theme.spacing.md }]}>Worker Declined</Text>
      <Text style={[theme.typography.body1, { textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.xxxl }]}>
        The selected worker is unable to take the job right now. Please select another recommended worker.
      </Text>
      <Button 
        title="View Other Matches" 
        onPress={() => setMatchState('results')} 
        fullWidth
      />
    </View>
  );

  return (
    <Screen safeArea>
      <View style={[styles.header, { paddingHorizontal: theme.layout.screenPadding }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>Worker Matching</Text>
        <View style={{ width: 40 }} />
      </View>

      {matchState === 'searching' && (
        <View style={styles.searchingContainer}>
          <Animated.View style={[styles.radarCenter, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.radarCenterSolid}>
            <MapPin color={theme.colors.surface} size={32} />
          </View>
          <Text style={[theme.typography.h3, { marginTop: theme.spacing.xxxl }]}>Broadcasting Request...</Text>
          <Text style={[theme.typography.body2, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'center' }]}>
            Finding verified, available workers using service compatibility, distance, availability, and performance history.
          </Text>
        </View>
      )}

      {matchState === 'no_workers' && renderNoWorkers()}
      {matchState === 'declined' && renderDeclined()}

      {matchState === 'results' && (
        <View style={styles.resultsContainer}>
          <Text style={[theme.typography.h3, { marginBottom: theme.spacing.md }]}>Top Eligible Matches</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {workers.map(worker => (
              <View key={worker.id} style={styles.workerCard}>
                <View style={styles.workerHeader}>
                  <Image source={worker.avatar} style={styles.avatarPlaceholder} contentFit="cover" />
                  <View style={styles.workerInfo}>
                    <Text style={theme.typography.h4}>{worker.name}</Text>
                    <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>{worker.skill}</Text>
                  </View>
                  <View style={styles.matchBadge}>
                    <Text style={[theme.typography.caption, { color: theme.colors.surface, fontWeight: '700' }]}>{worker.confidence}% Match</Text>
                  </View>
                </View>

                <View style={styles.workerStats}>
                  <View style={styles.stat}>
                    <Star color={theme.colors.warning} size={16} fill={theme.colors.warning} />
                    <Text style={[theme.typography.label, { marginLeft: 4 }]}>{worker.rating}</Text>
                  </View>
                  <Text style={{ color: theme.colors.border }}>|</Text>
                  <View style={styles.stat}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{worker.distance} away</Text>
                  </View>
                  <Text style={{ color: theme.colors.border }}>|</Text>
                  <View style={styles.stat}>
                    <Text style={[theme.typography.label, { color: theme.colors.primary }]}>{worker.price}</Text>
                  </View>
                </View>

                <View style={styles.workerActions}>
                  <Button 
                    title="Message" 
                    variant="outlined" 
                    icon={MessageSquare} 
                    style={{ flex: 1, marginRight: theme.spacing.sm }} 
                    onPress={() => router.push(`/messages/chat?id=${worker.id}`)}
                  />
                  <Button 
                    title="Hire Now" 
                    style={{ flex: 1 }} 
                    onPress={() => void handleHire(worker.id)} 
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  searchingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xl },
  radarCenter: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: `${theme.colors.primary}30` },
  radarCenterSolid: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xl },
  resultsContainer: { flex: 1, paddingVertical: theme.spacing.md },
  workerCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadows.md },
  workerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.border, marginRight: theme.spacing.md },
  workerInfo: { flex: 1 },
  matchBadge: { backgroundColor: theme.colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm },
  workerStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.background, padding: theme.spacing.sm, borderRadius: theme.radius.md, marginBottom: theme.spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center' },
  workerActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
