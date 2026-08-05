import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Bell, MapPin, Star, ChevronRight, Droplets, Zap, Wrench, Sparkles, Monitor, Fan, Paintbrush, Shovel, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import {
  fetchBookings,
  fetchCustomerProfile,
  fetchProviders,
  fetchServiceCategories,
  subscribeToTable,
} from '@/services/api';
import { homeCategories, homePromotions } from '@/constants/mockData';
import * as Haptics from 'expo-haptics';

const getParentForCategory = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('clean')) return 'Cleaning';
  if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('water')) return 'Plumbing';
  if (lower.includes('elect')) return 'Electrical';
  if (lower.includes('carpent') || lower.includes('wood')) return 'Carpentry';
  if (lower.includes('cool') || lower.includes('ac ') || lower.includes('air')) return 'Cooling';
  if (lower.includes('paint')) return 'Painting';
  if (lower.includes('appliance') || lower.includes('tv ') || lower.includes('fridge')) return 'Appliance';
  return 'Handyman';
};

const PARENT_CATEGORIES = [
  { id: 'p1', label: 'Cleaning', icon: Sparkles },
  { id: 'p2', label: 'Plumbing', icon: Droplets },
  { id: 'p3', label: 'Electrical', icon: Zap },
  { id: 'p4', label: 'Carpentry', icon: Wrench },
  { id: 'p5', label: 'Cooling', icon: Fan },
  { id: 'p6', label: 'Painting', icon: Paintbrush },
  { id: 'p7', label: 'Appliance', icon: Monitor },
  { id: 'p8', label: 'Handyman', icon: Shovel },
];

const CATEGORY_COLORS = [
  { color: '#0ea5e9', bg: '#e0f2fe' },
  { color: '#f59e0b', bg: '#fef3c7' },
  { color: '#10b981', bg: '#d1fae5' },
  { color: '#06b6d4', bg: '#cffafe' },
  { color: '#6366f1', bg: '#e0e7ff' },
  { color: '#3b82f6', bg: '#dbeafe' },
  { color: '#8b5cf6', bg: '#ede9fe' },
  { color: '#22c55e', bg: '#dcfce7' },
];

const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=400&auto=format&fit=crop',
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state: any) => state.user);
  const insets = useSafeAreaInsets();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  const groupedCategories = useMemo(() => {
    const groups: Record<string, any[]> = {
      Cleaning: [], Plumbing: [], Electrical: [], Carpentry: [], Cooling: [], Painting: [], Appliance: [], Handyman: []
    };
    categories.forEach(cat => {
      const parent = getParentForCategory(cat.label);
      if (groups[parent]) groups[parent].push(cat);
    });
    return groups;
  }, [categories]);

  useEffect(() => {
    const load = () =>
      void Promise.all([
        fetchServiceCategories(),
        fetchProviders(),
        fetchCustomerProfile(),
        fetchBookings(),
      ]).then(([catalog, providers, account, bookingRows]) => {
        setCategories(catalog.data);
        setWorkers(providers.data);
        if (!account.error) setProfile(account.data);
        setBookings(bookingRows.data);
      });
    load();
    return subscribeToTable('bookings', load);
  }, []);

  const activeBookingsCount = bookings.filter((row) => !['completed', 'cancelled'].includes(row.status)).length;
  const lastCompletedWorkerName = bookings.find((row) => row.status === 'completed')?.providerName ?? 'No completed booking';

  return (
    <View style={styles.container}>
      <View style={[styles.topNav, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.searchBar} 
            activeOpacity={0.8}
            onPress={() => router.push('/search' as any)}
          >
            <Search color={theme.colors.textSecondary} size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.colors.textTertiary, fontSize: 14 }}>Search workers...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
            <Bell color={theme.colors.surface} size={24} />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarButton} onPress={() => router.push('/(tabs)/profile')}>
            <Image 
              source={profile?.avatarUri || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop"}
              style={styles.headerAvatar} 
              contentFit="cover" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeInDown.duration(300).springify()} style={[styles.aiPromoCard, { marginTop: theme.spacing.sm }]}>
          <LinearGradient
            colors={['#1e3a8a', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.aiPromoContent}>
            <Text style={[theme.typography.body2, { color: 'rgba(255,255,255,0.9)' }]}>Good morning, {user?.name || 'Guest'} 👋</Text>
            <Text style={[theme.typography.h3, { color: theme.colors.surface, marginBottom: 8, marginTop: 4 }]}>Need Help Around the House?</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.surface, opacity: 0.9, marginBottom: 16 }]}>
              Let A-yos AI understand your needs, recommend the right service, and connect you with trusted, verified workers near you.
            </Text>
            <TouchableOpacity style={styles.aiPromoButton} onPress={() => { router.push('/new-request/create'); }}>
              <Text style={[theme.typography.button, { color: theme.colors.primary, fontSize: 13 }]}>Try A-yos AI</Text>
              <Sparkles color={theme.colors.primary} size={14} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
          <Image 
            source="https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=400&auto=format&fit=crop" 
            style={styles.aiPromoImage}
            contentFit="cover"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.mainCard}>
          <View style={styles.categoriesGrid}>
            {PARENT_CATEGORIES.map((parentCat, index) => {
              const Icon = parentCat.icon;
              const colorTheme = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              return (
                <Animated.View key={parentCat.id} entering={FadeInDown.delay(index * 50).duration(400).springify()} style={styles.categoryItemWrap}>
                  <TouchableOpacity 
                    style={styles.categoryItem} 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedParent(parentCat.label);
                    }}
                  >
                    <View style={[styles.categoryIconContainer, { backgroundColor: colorTheme.bg }]}>
                      <Icon color={colorTheme.color} size={28} />
                    </View>
                    <Text style={[theme.typography.caption, styles.categoryName]}>{parentCat.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.widgetsRow}>
            <TouchableOpacity style={styles.widgetCard} onPress={() => router.push('/bookings' as any)}>
              <View>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 4 }]}>Active bookings</Text>
                <Text style={[theme.typography.h3, { color: theme.colors.primary }]}>{activeBookingsCount}</Text>
              </View>
              <View style={{ backgroundColor: `${theme.colors.primary}15`, padding: 10, borderRadius: 12 }}>
                <Calendar color={theme.colors.primary} size={24} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.widgetCard}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 4 }]}>Rate</Text>
                <Text style={[theme.typography.body1, { fontWeight: '600', color: theme.colors.textPrimary }]} numberOfLines={1}>{lastCompletedWorkerName}</Text>
              </View>
              <View style={{ backgroundColor: `${theme.colors.warning}15`, padding: 10, borderRadius: 12 }}>
                <Star color={theme.colors.warning} size={24} fill={theme.colors.warning} />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>



        <Animated.View entering={FadeInDown.delay(300).duration(500).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={theme.typography.h3}>Exclusive Promos</Text>
            <ChevronRight color={theme.colors.textSecondary} size={20} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoScroll}>
            {homePromotions.map((promo, index) => (
              <TouchableOpacity key={promo.id} style={styles.promoCard}>
                <Image source={promo.image} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                <View style={{ zIndex: 1, padding: theme.spacing.lg }}>
                  <Text style={[theme.typography.h2, styles.promoTitle]}>{promo.title}</Text>
                  <Text style={[theme.typography.body1, styles.promoSubtitle]}>{promo.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500).springify()} style={styles.bannerContainer}>
          <View style={styles.bannerContent}>
            <Text style={[theme.typography.h4, { color: theme.colors.primary }]}>Discover popular</Text>
            <Text style={[theme.typography.h4, { color: theme.colors.primary }]}>service picks</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={[theme.typography.button, { color: theme.colors.textPrimary, fontSize: 12 }]}>See top workers</Text>
            </TouchableOpacity>
          </View>
          <Image 
            source="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop" 
            style={styles.bannerImage}
            contentFit="cover"
          />
        </Animated.View>

        <View style={styles.recommendedGrid}>
          {workers.slice(0, 4).map((worker, index) => {
            const coverImage = FALLBACK_COVERS[index % FALLBACK_COVERS.length];
            return (
              <Animated.View key={worker.id} entering={FadeInDown.delay(500 + (index * 100)).duration(500).springify()} style={styles.recommendedCardWrapper}>
                <TouchableOpacity 
                  style={styles.recommendedCard}
                  onPress={() => router.push(`/provider/${worker.id}` as any)}
                >
                  <View style={styles.recommendedImageContainer}>
                    <Image source={coverImage} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    {index === 0 && (
                      <View style={styles.promoTag}>
                        <Text style={{ color: theme.colors.surface, fontSize: 10, fontWeight: '700' }}>15% OFF</Text>
                      </View>
                    )}
                    <View style={styles.providerBadge}>
                      <Image source={worker.avatarUri || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'} style={styles.providerAvatar} contentFit="cover" />
                    </View>
                  </View>
                  <View style={styles.recommendedInfo}>
                    <Text style={theme.typography.body1} numberOfLines={1}>{worker.name}</Text>
                    <View style={styles.recommendedMeta}>
                      <View style={styles.ratingRow}>
                        <Star color={theme.colors.warning} size={14} fill={theme.colors.warning} />
                        <Text style={[theme.typography.caption, { marginLeft: 4 }]}>{worker.rating?.toFixed(1) || '0.0'}</Text>
                      </View>
                      <View style={styles.distanceRow}>
                        <MapPin color={theme.colors.textSecondary} size={14} />
                        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginLeft: 2 }]}>{worker.distance || '0km'}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedParent}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedParent(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedParent(null)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={theme.typography.h3}>{selectedParent} Services</Text>
              <TouchableOpacity onPress={() => setSelectedParent(null)}>
                <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {selectedParent && groupedCategories[selectedParent] && groupedCategories[selectedParent].length > 0 ? (
                groupedCategories[selectedParent].map((subcat: any) => (
                  <TouchableOpacity 
                    key={subcat.id} 
                    style={styles.subcatItem}
                    onPress={() => {
                      setSelectedParent(null);
                      router.push(`/category/${subcat.label.toLowerCase()}` as any);
                    }}
                  >
                    <Text style={theme.typography.body1}>{subcat.label}</Text>
                    <ChevronRight color={theme.colors.textTertiary} size={20} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textSecondary }}>No services available in this category yet.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topNav: { backgroundColor: '#1e3a8a', paddingHorizontal: theme.layout.screenPadding, paddingBottom: theme.spacing.md },
  greetingRow: { marginBottom: theme.spacing.md },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, height: 44, marginRight: theme.spacing.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.sm },
  badge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.error, borderWidth: 1, borderColor: '#1e3a8a' },
  avatarButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: theme.colors.surface },
  headerAvatar: { width: '100%', height: '100%' },
  content: { flex: 1, zIndex: 5 },
  contentContainer: { paddingBottom: theme.spacing.xxxl, paddingTop: theme.spacing.lg },
  mainCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, marginHorizontal: theme.layout.screenPadding, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md, ...theme.shadows.md, marginBottom: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.borderLight },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  categoryItemWrap: { width: '25%' },
  categoryItem: { alignItems: 'center', marginBottom: theme.spacing.lg },
  categoryIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.xs },
  categoryName: { textAlign: 'center', color: theme.colors.textPrimary, fontSize: 11, fontWeight: '500' },
  seeMoreBtn: { alignSelf: 'center', paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.md },
  widgetsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingTop: theme.spacing.md },
  widgetCard: { flex: 0.48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.background, padding: theme.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderLight },
  
  aiPromoCard: { marginHorizontal: theme.layout.screenPadding, backgroundColor: '#1e40af', borderRadius: theme.radius.xl, flexDirection: 'row', overflow: 'hidden', marginBottom: theme.spacing.xl, ...theme.shadows.md },
  aiPromoContent: { flex: 1.5, padding: theme.spacing.lg, justifyContent: 'center' },
  aiPromoButton: { backgroundColor: theme.colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.full, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  aiPromoImage: { flex: 1, opacity: 0.9 },

  section: { marginBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.layout.screenPadding, marginBottom: theme.spacing.md },
  promoScroll: { paddingHorizontal: theme.layout.screenPadding, flexGrow: 0 },
  promoCard: { width: 280, height: 160, borderRadius: theme.radius.xl, marginRight: theme.spacing.md, overflow: 'hidden', justifyContent: 'flex-end' },
  categoryPromoCard: { width: 280, height: 160, borderRadius: theme.radius.xl, marginRight: theme.spacing.md, overflow: 'hidden', justifyContent: 'flex-end' },
  promoTitle: { color: theme.colors.surface, marginBottom: 4 },
  promoSubtitle: { color: theme.colors.surface, opacity: 0.9 },
  bannerContainer: { marginHorizontal: theme.layout.screenPadding, backgroundColor: '#f3e8ff', borderRadius: theme.radius.xl, flexDirection: 'row', overflow: 'hidden', marginBottom: theme.spacing.xl, height: 120 },
  bannerContent: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  bannerButton: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, paddingVertical: 8, borderRadius: theme.radius.full, alignSelf: 'flex-start', marginTop: theme.spacing.sm },
  bannerImage: { width: 140, height: '100%' },
  recommendedGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: theme.layout.screenPadding },
  recommendedCardWrapper: { width: '48%', marginBottom: theme.spacing.md },
  recommendedCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderLight },
  recommendedImageContainer: { height: 140, width: '100%' },
  promoTag: { position: 'absolute', top: 8, left: 8, backgroundColor: '#f97316', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
  providerBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: theme.colors.warning, padding: 2, borderRadius: 4 },
  providerAvatar: { width: 24, height: 24, borderRadius: 2 },
  recommendedInfo: { padding: theme.spacing.sm },
  recommendedMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  distanceRow: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  subcatItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
});
