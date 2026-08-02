import { styles } from './WorkerReviewsScreen.styles';
import { View, Text } from 'react-native';
import { theme } from '@/constants/theme';
import { ReviewsTab } from '@/components/ReviewsTab';
import { SearchBar } from '@/components/SearchBar';
import type { useWorkerReviewsScreenController } from '../hooks/useWorkerReviewsScreenController';

export function WorkerReviewsView({
  model,
}: {
  model: ReturnType<typeof useWorkerReviewsScreenController>;
}) {
  const { insets, searchQuery, setSearchQuery, reviews, filteredReviews } =
    model;
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
