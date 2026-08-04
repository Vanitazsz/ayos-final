import { styles } from './TabsHomeScreen.styles';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { theme } from '@/constants/theme';
import {
  Search,
  Bell,
  MapPin,
  Star,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react-native';
import { iconFor } from '@/utils/iconFor';
import type { useTabsHomeScreenController } from '../hooks/useTabsHomeScreenController';
export function HomeView({
  model,
}: {
  model: ReturnType<typeof useTabsHomeScreenController>;
}) {
  const {
    router,
    user,
    insets,
    visibleCategoryCount,
    setVisibleCategoryCount,
    serviceQuery,
    categories,
    workers,
    profile,
    bookings,
    filteredCategories,
    hasMoreCategories,
    updateServiceQuery,
    Image,
  } = model;
  return (
    <View style={styles.container}>
      {/* Top Nav (Fixed at the top) */}
      <View
        style={[styles.topNav, { paddingTop: insets.top + theme.spacing.sm }]}
      >
        <View style={styles.greetingRow}>
          <View>
            <Text
              style={[
                theme.typography.body2,
                { color: 'rgba(255,255,255,0.8)' },
              ]}
            >
              Good morning,
            </Text>
            <Text
              style={[theme.typography.h3, { color: theme.colors.surface }]}
            >
              {user?.name || 'Guest'} 👋
            </Text>
            <View style={styles.subdivisionRow}>
              <MapPin color="rgba(255,255,255,0.8)" size={13} />
              <Text style={styles.subdivisionText}>
                {profile?.subdivisionName || 'Subdivision not set'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerTopRow}>
          <View style={styles.searchBar}>
            <Search
              color={theme.colors.textSecondary}
              size={20}
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Search services"
              style={styles.searchInput}
              placeholderTextColor={theme.colors.textTertiary}
              value={serviceQuery}
              onChangeText={updateServiceQuery}
              returnKeyType="search"
              accessibilityLabel="Search services"
            />
            {serviceQuery.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear service search"
                onPress={() => updateServiceQuery('')}
                hitSlop={8}
              >
                <X color={theme.colors.textSecondary} size={18} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell color={theme.colors.surface} size={24} />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Image
              source={profile?.avatarUri}
              style={styles.headerAvatar}
              contentFit="cover"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* White Card */}
        <View style={[styles.mainCard, { marginTop: theme.spacing.md }]}>
          {/* Categories Grid */}
          <View style={styles.categoriesGrid}>
            {filteredCategories.slice(0, visibleCategoryCount).map((cat) => {
              const Icon = iconFor(cat.label);
              return (
                <TouchableOpacity
                  key={cat.id}
                  testID="home-service-category"
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                  style={styles.categoryItem}
                  onPress={() =>
                    router.push(`/category/${cat.label.toLowerCase()}` as any)
                  }
                >
                  <View
                    style={[
                      styles.categoryIconContainer,
                      { backgroundColor: theme.colors.infoBackground },
                    ]}
                  >
                    <Icon color={theme.colors.primary} size={28} />
                  </View>
                  <Text style={[theme.typography.caption, styles.categoryName]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {serviceQuery.trim() && filteredCategories.length === 0 ? (
            <View style={styles.noServicesState}>
              <Search color={theme.colors.textTertiary} size={28} />
              <Text style={styles.noServicesText}>No services found</Text>
            </View>
          ) : null}

          {hasMoreCategories && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="See more service categories"
              style={styles.seeMoreButton}
              onPress={() =>
                setVisibleCategoryCount((count) =>
                  Math.min(count + 4, filteredCategories.length),
                )
              }
            >
              <Text style={styles.seeMoreText}>See more</Text>
              <ChevronDown color={theme.colors.primary} size={18} />
            </TouchableOpacity>
          )}

          {/* Widgets Row */}
          <View style={styles.widgetsRow}>
            <TouchableOpacity style={styles.widgetCard}>
              <View>
                <Text style={theme.typography.caption}>Active bookings</Text>
                <Text style={theme.typography.h4}>
                  {
                    bookings.filter(
                      (row) => !['completed', 'cancelled'].includes(row.status),
                    ).length
                  }
                </Text>
              </View>
              <Wallet color={theme.colors.primary} size={24} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.widgetCard}>
              <View style={{ flex: 1 }}>
                <Text style={theme.typography.caption}>Rate</Text>
                <Text style={theme.typography.body2} numberOfLines={1}>
                  {bookings.find((row) => row.status === 'completed')
                    ?.providerName ?? 'No completed booking'}
                </Text>
              </View>
              <Star
                color={theme.colors.warning}
                size={24}
                fill={theme.colors.warning}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* A-yos AI Promo Ad */}
        <View style={styles.aiPromoCard}>
          <View style={styles.aiPromoContent}>
            <Text
              style={[
                theme.typography.h3,
                { color: theme.colors.surface, marginBottom: 8 },
              ]}
            >
              Need Help Around the House?
            </Text>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.surface, opacity: 0.9, marginBottom: 16 },
              ]}
            >
              Let A-yos AI understand your needs, recommend the right service,
              and connect you with trusted, verified workers near you.
            </Text>
            <TouchableOpacity
              style={styles.aiPromoButton}
              onPress={() => router.push('/new-request/create')}
            >
              <Text
                style={[
                  theme.typography.button,
                  { color: theme.colors.primary, fontSize: 13 },
                ]}
              >
                Try A-yos AI
              </Text>
              <Sparkles
                color={theme.colors.primary}
                size={14}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.aiPromoImage} />
        </View>

        {/* Promotions Carousel (Order Now style) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={theme.typography.h3}>Book Now</Text>
            <ChevronRight color={theme.colors.textSecondary} size={20} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.promoScroll}
          >
            {categories.slice(0, 4).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.promoCard}
                onPress={() =>
                  router.push(`/category/${category.label.toLowerCase()}`)
                }
              >
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
                <View style={{ zIndex: 1, padding: theme.spacing.lg }}>
                  <Text style={[theme.typography.h2, styles.promoTitle]}>
                    {category.label}
                  </Text>
                  <Text style={[theme.typography.body1, styles.promoSubtitle]}>
                    Browse verified available workers
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Text
              style={[theme.typography.h4, { color: theme.colors.primary }]}
            >
              Discover popular
            </Text>
            <Text
              style={[theme.typography.h4, { color: theme.colors.primary }]}
            >
              service picks
            </Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text
                style={[
                  theme.typography.button,
                  { color: theme.colors.textPrimary, fontSize: 12 },
                ]}
              >
                See top workers
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerImage} />
        </View>

        {/* Recommended Workers Grid */}
        <View style={styles.recommendedGrid}>
          {workers.slice(0, 6).map((worker) => (
            <TouchableOpacity
              key={worker.id}
              style={styles.recommendedCard}
              onPress={() => router.push(`/provider/${worker.id}`)}
            >
              <View style={styles.recommendedImageContainer}>
                <Image
                  source={worker.avatarUri}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
                <View style={styles.providerBadge}>
                  <Image
                    source={worker.avatarUri}
                    style={styles.providerAvatar}
                    contentFit="cover"
                  />
                </View>
              </View>
              <View style={styles.recommendedInfo}>
                <Text style={theme.typography.body1} numberOfLines={2}>
                  {worker.name}
                </Text>
                <View style={styles.recommendedMeta}>
                  <View style={styles.ratingRow}>
                    <Star
                      color={theme.colors.warning}
                      size={14}
                      fill={theme.colors.warning}
                    />
                    <Text style={[theme.typography.caption, { marginLeft: 4 }]}>
                      {worker.rating}
                    </Text>
                  </View>
                  <View style={styles.distanceRow}>
                    <MapPin color={theme.colors.textSecondary} size={14} />
                    <Text
                      style={[
                        theme.typography.caption,
                        { color: theme.colors.textSecondary, marginLeft: 2 },
                      ]}
                    >
                      {worker.distance}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
