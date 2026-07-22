import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, ListRenderItem, Alert, Share } from 'react-native';
import { randomUUID } from '@/lib/crypto';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { SearchBar } from '@/components/SearchBar';
import { Chip } from '@/components/Chip';
import { JobPostCard } from '@/components/JobPostCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { fetchWorkerJobs, submitBid, subscribeToTable, type JobOpportunity, type JobComment } from '@/services/api';

const filterOptions = ['All', 'Urgent', 'Nearby', 'High Pay'];
const sortOptions = ['Nearest', 'Highest Pay', 'Most Recent'];

export default function WorkerBrowseScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Nearest');
  const [commentSortNewest, setCommentSortNewest] = useState(true);
  const [jobs,setJobs]=useState<JobOpportunity[]>([]);
  const [allComments, setAllComments] = useState<Record<string, JobComment[]>>({});
  useEffect(()=>{const load=()=>void fetchWorkerJobs().then((result)=>{if(result.error)Alert.alert('Jobs unavailable',result.error);else setJobs(result.data)});load();return subscribeToTable('service_requests',load);},[]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (j) => j.customerName.toLowerCase().includes(q) || j.service.toLowerCase().includes(q) || j.description.toLowerCase().includes(q),
      );
    }

    if (activeFilter === 'Urgent') result = result.filter((j) => j.urgency === 'urgent');
    if (activeFilter === 'Nearby') result = result.filter((j) => parseFloat(j.distance) <= 1.5);
    const price=(value:string)=>Number(value.replace(/[^0-9.]/g,''));
    if (activeFilter === 'High Pay') result = result.filter((j) => price(j.offeredPrice) >= 1000);

    if (sortBy === 'Highest Pay') result.sort((a, b) => price(b.offeredPrice) - price(a.offeredPrice));
    if (sortBy === 'Most Recent') result.sort((a, b) => a.postedTime.localeCompare(b.postedTime));

    return result;
  }, [query, activeFilter, sortBy, jobs]);

  const handleComment = useCallback((jobId: string, text: string, offerMin: string, offerMax: string) => {
    const amount=Number(offerMin||offerMax);
    if(!Number.isFinite(amount)||amount<=0){Alert.alert('Offer required','Enter a valid offer in PHP.');return;}
  void submitBid(jobId,Math.round(amount*100),text,60).then(()=>{setAllComments((prev)=>({...prev,[jobId]:[{id:randomUUID(),jobId,author:'You',avatarUri:'',text,offerMin:`₱${amount.toLocaleString()}`,postedTime:'Just now'},...(prev[jobId]||[])]}));}).catch((error)=>Alert.alert('Bid not submitted',error instanceof Error?error.message:'Please try again.'));
  }, []);

  const handleShare = useCallback((jobId: string) => { void Share.share({message:`A-yos service request ${jobId}`}); }, []);

  const renderItem: ListRenderItem<JobOpportunity> = useCallback(
    ({ item }) => (
      <JobPostCard
        job={item}
        comments={allComments[item.id] || []}
        sortNewest={commentSortNewest}
        onToggleSort={() => setCommentSortNewest(!commentSortNewest)}
        onComment={handleComment}
        onShare={handleShare}
      />
    ),
    [allComments, commentSortNewest, handleComment, handleShare],
  );

  const keyExtractor = useCallback((item: JobOpportunity) => item.id, []);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Job Posts" />
      <FlatList
        data={filteredJobs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing['3'] }} />}
        ListHeaderComponent={
          <View>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search jobs..."
              //style={{ marginTop: Spacing['0'] }}
            />
            <FlatList
              data={filterOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item }) => (
                <Chip
                  label={item}
                  selected={activeFilter === item}
                  onPress={() => setActiveFilter(item)}
                  size="sm"
                />
              )}
              keyExtractor={(item) => item}
            />
            <FlatList
              data={sortOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item }) => (
                <Chip
                  label={item}
                  selected={sortBy === item}
                  onPress={() => setSortBy(item)}
                  size="sm"
                />
              )}
              keyExtractor={(item) => item}
            />
            <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginTop: Spacing['4'], marginBottom: Spacing['1'], marginLeft: Spacing ['2'] }}>
              {filteredJobs.length} posts available
            </AppText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing['4'], paddingBottom: 100 },
  chipRow: { gap: Spacing['2'], marginTop: Spacing['3'] },
});
