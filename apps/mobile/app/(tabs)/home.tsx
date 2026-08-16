import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Image } from 'expo-image';
import { Avatar } from '@/components/Avatar';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, SearchX, Bell, Star, ChevronRight, Sparkles, Calendar, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { homePromotions } from '@/constants/mockData';
import * as Haptics from 'expo-haptics';
import { showAlert } from '@/components/AppAlert';
import { styles } from '@/features/customer/CustomerHome.styles';
import { ServiceCategoryGrid } from '@/features/customer/ServiceCategoryGrid';
import { ServiceCategorySheet } from '@/features/customer/ServiceCategorySheet';
import { useHomeData } from '@/hooks/useHomeData';
import { useNotificationsGate } from '@/hooks/useNotificationsGate';
import { filterServiceCatalog } from '@/services/catalogSearch';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user, categories, industries, profile, activeBookingsCount, lastCompletedWorkerName } = useHomeData();
  const openNotifications = useNotificationsGate();
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [serviceQuery, setServiceQuery] = useState('');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const headerRef = useRef<View>(null);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const selectedIndustry = useMemo(
    () => industries.find((item) => item.name === selectedParent) ?? null,
    [industries, selectedParent],
  );
  const selectedSkills = useMemo(
    () => selectedIndustry?.skills ?? [],
    [selectedIndustry],
  );

  const filteredCategories = useMemo(
    () => filterServiceCatalog(categories, serviceQuery),
    [categories, serviceQuery],
  );

  const dropdownMaxHeight = useMemo(() => {
    const available =
      windowHeight -
      headerHeight -
      (Platform.OS === 'ios' ? keyboardHeight : 0) -
      24;
    return Math.min(Math.max(available, 160), 400);
  }, [windowHeight, headerHeight, keyboardHeight]);

  const handleSelectSkill = (skill: { id: string }) => {
    setServiceQuery('');
    setSelectedParent(null);
    router.push({ pathname: '/new-request/create', params: { categoryId: skill.id } });
  };

  return (
    <View style={styles.container}>
      <View
        ref={headerRef}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
        style={[styles.topNav, { paddingTop: insets.top + theme.spacing.sm }]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.searchBar}>
            <Search color={theme.colors.textSecondary} size={20} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search services"
              style={styles.searchInput}
              placeholderTextColor={theme.colors.textTertiary}
              value={serviceQuery}
              onChangeText={setServiceQuery}
              returnKeyType="search"
              accessibilityLabel="Search services"
            />
            {serviceQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setServiceQuery('')}
                hitSlop={8}
                accessibilityLabel="Clear service search"
              >
                <X color={theme.colors.textSecondary} size={18} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={openNotifications} accessibilityLabel="Notifications">
            <Bell color={theme.colors.surface} size={24} />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarButton} onPress={() => router.push('/(tabs)/profile')}>
            <Avatar
              uri={profile?.avatarUri}
              name={profile?.name}
              size={40}
              borderRadius={20}
              style={{ borderWidth: 2, borderColor: theme.colors.surface }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {serviceQuery.trim().length > 0 && headerHeight > 0 && (
        <>
          <Pressable
            style={[styles.searchBackdrop, { top: headerHeight }]}
            onPress={() => setServiceQuery('')}
          />
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={[styles.searchDropdown, { top: headerHeight + 4 }]}
          >
            {filteredCategories.length > 0 ? (
              <ScrollView
                style={[styles.searchDropdownScroll, { maxHeight: dropdownMaxHeight }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {filteredCategories.map((subcat: any) => (
                  <TouchableOpacity
                    key={subcat.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectSkill(subcat)}
                  >
                    <Text style={theme.typography.body1}>{subcat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.searchEmpty}>
                <SearchX color={theme.colors.textTertiary} size={20} />
                <Text style={styles.searchEmptyText}>
                  No services found for “{serviceQuery.trim()}”
                </Text>
              </View>
            )}
          </Animated.View>
        </>
      )}

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
          <ServiceCategoryGrid
            industries={industries}
            onSelect={(industry) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedParent(industry.name);
            }}
          />

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
            {homePromotions.map((promo) => (
              <TouchableOpacity
                key={promo.id}
                style={styles.promoCard}
                onPress={() =>
                  showAlert(
                    'Coming Soon',
                    'Promo codes will be available in a future update.',
                  )
                }
              >
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

        <Animated.View entering={FadeInDown.delay(400).duration(500).springify()} style={styles.aiPromoCard}>
          <LinearGradient
            colors={['#1e3a8a', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={styles.promoPressable}
            activeOpacity={0.85}
            onPress={() =>
              showAlert(
                'Coming Soon',
                'Worker recommendations will be available in a future update.',
              )
            }
          >
            <View style={styles.aiPromoContent}>
              <Text style={[theme.typography.h4, { color: theme.colors.surface, marginBottom: 8 }]}>Discover popular workers</Text>
              <Text style={[theme.typography.caption, { color: theme.colors.surface, opacity: 0.9, marginBottom: 16 }]}>
                Top-rated workers trusted by homeowners near you.
              </Text>
            </View>
            <Image
              source="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop"
              style={styles.aiPromoImage}
              contentFit="cover"
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <ServiceCategorySheet
        visible={!!selectedParent}
        industry={selectedIndustry}
        items={selectedSkills}
        onSelect={(skill) => handleSelectSkill(skill)}
        onClose={() => setSelectedParent(null)}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
