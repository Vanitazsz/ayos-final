import { styles } from './CategoryIdScreen.styles';
import { View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  Star,
  MapPin,
  CheckCircle2,
  Search,
} from 'lucide-react-native';
import type { useCategoryIdScreenController } from '../hooks/useCategoryIdScreenController';

export function CategoryView({
  model,
}: {
  model: ReturnType<typeof useCategoryIdScreenController>;
}) {
  const { router, id, workers, title, Image } = model;
  return (
    <Screen safeArea scrollable backgroundColor={theme.colors.background}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          {title} Experts
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        {workers.length ? (
          workers.map((worker) => (
            <TouchableOpacity
              key={worker.id}
              style={styles.workerCard}
              onPress={() => router.push(`/provider/${worker.id}`)}
            >
              <Image
                source={worker.avatarUri}
                style={styles.workerAvatar}
                contentFit="cover"
              />
              <View style={styles.workerInfo}>
                <View style={styles.workerHeader}>
                  <Text style={theme.typography.h4}>{worker.name}</Text>
                  {worker.verified && (
                    <CheckCircle2
                      color={theme.colors.primary}
                      size={16}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Star
                      color={theme.colors.warning}
                      fill={theme.colors.warning}
                      size={14}
                    />
                    <Text style={[theme.typography.caption, { marginLeft: 3 }]}>
                      {worker.rating.toFixed(1)} ({worker.reviewCount})
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MapPin color={theme.colors.textSecondary} size={14} />
                    <Text style={[theme.typography.caption, { marginLeft: 3 }]}>
                      {worker.distance}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.priceContainer}>
                <Text
                  style={[
                    theme.typography.label,
                    { color: theme.colors.primary },
                  ]}
                >
                  {worker.price ?? 'Quote required'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Search color={theme.colors.textTertiary} size={48} />
            <Text
              style={[
                theme.typography.h4,
                {
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing.md,
                },
              ]}
            >
              No workers found
            </Text>
            <Text
              style={[
                theme.typography.body2,
                {
                  color: theme.colors.textTertiary,
                  textAlign: 'center',
                  marginTop: 4,
                },
              ]}
            >
              Try adjusting your location or checking back later.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
