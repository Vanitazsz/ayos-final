import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { ReviewsTab } from '@/components/ReviewsTab';
import { SearchBar } from '@/components/SearchBar';
import { fetchWorkerReviews, type ReviewData } from '@/services/api';

export default function WorkerReviewsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  useEffect(() => { void fetchWorkerReviews().then((result) => setReviews(result.data)); }, []);

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter(
      (r) =>
        r.author.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.serviceType.toLowerCase().includes(q),
    );
  }, [searchQuery, reviews]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ReviewsTab
        reviews={filteredReviews}
        headerComponent={
          <View>
            <View style={styles.header}>
              <Text style={theme.typography.h2}>My Reviews</Text>
            </View>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search reviews..."
              style={styles.searchBar}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingVertical: theme.spacing.md },
  searchBar: { marginBottom: theme.spacing.md },
});
