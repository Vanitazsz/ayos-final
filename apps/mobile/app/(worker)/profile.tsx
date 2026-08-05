import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronRight,
  User,
  Wrench,
  MapPin,
  Briefcase,
  Wallet,
  Clock,
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  Star,
  CheckCircle,
  BadgeCheck,
  ArrowUpFromLine,
  PlusCircle,
  Pencil,
  DollarSign,
} from 'lucide-react-native';
import { fetchWorkerProfile } from '@/services/api';
import { formatRating } from '@/services/reviewRatings';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { getMyProfile, uploadMyAvatar } from '@/services/profile';
import { Chip } from '@/components/Chip';
import {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
} from '@/services/workerMatching';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { id: 'personal', title: 'Personal Information', icon: User },
      { id: 'industry', title: 'Industry & Skills', icon: Wrench },
      { id: 'areas', title: 'Service Areas', icon: MapPin },
    ],
  },
  {
    title: 'Work Portfolio',
    items: [
      { id: 'portfolio', title: 'Portfolio', icon: Briefcase },
      { id: 'reviews', title: 'My Reviews', icon: Star },
    ],
  },
  {
    title: 'Payments',
    items: [
      { id: 'transaction-history', title: 'Transaction History', icon: Clock },
      { id: 'payout-methods', title: 'Payout Methods', icon: Wallet },
      { id: 'payout-history', title: 'Payout History', icon: Clock },
      { id: 'topup-methods', title: 'Top-Up Methods', icon: ArrowUpFromLine },
      { id: 'topup-history', title: 'Top-Up History', icon: PlusCircle },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'notifications', title: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      { id: 'verification', title: 'Verification', icon: BadgeCheck },
      { id: 'help', title: 'Help Center', icon: HelpCircle },
      { id: 'privacy', title: 'Privacy Policy', icon: Shield },
    ],
  },
];

export default function WorkerProfileScreen() {
  const router = useRouter();
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [matchingReadiness, setMatchingReadiness] =
    useState<WorkerMatchingReadiness | null>(null);
  const load = useCallback(async () => {
    setLoadError('');
    try {
      const result = await fetchWorkerProfile();
      if (result.error || !result.data) {
        throw new Error(result.error ?? 'Worker profile is not active');
      }

      let accountProfile: Awaited<ReturnType<typeof getMyProfile>> | null =
        null;
      try {
        accountProfile = await getMyProfile();
      } catch {
        // The worker profile data is sufficient to render this screen. Account
        // details are optional here and may be unavailable during migrations.
      }
      if (accountProfile?.role && accountProfile.role !== 'WORKER') {
        throw new Error('Worker profile is not active');
      }

      let readiness: WorkerMatchingReadiness | null = null;
      try {
        readiness = await getWorkerMatchingReadiness();
      } catch {
        // Matching availability is optional here and must not block the profile.
      }
      setMatchingReadiness(readiness);

      setWorkerProfile(result.data);
    } catch (error) {
      setWorkerProfile(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load worker profile',
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const chooseAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;
      const updated = await uploadMyAvatar(
        result.assets[0].uri,
        result.assets[0].mimeType ?? 'image/jpeg',
      );
      setWorkerProfile((current: any) => ({
        ...current,
        avatarUri: updated.avatarUri,
      }));
    } catch (error) {
      Alert.alert(
        'Profile photo',
        error instanceof Error
          ? error.message
          : 'Unable to update profile photo',
      );
    }
  };
  const toggleMatching = async (value: boolean) => {
    if (!matchingReadiness) return;
    try {
      const result = await saveWorkerMatchingSetup({
        latitude: matchingReadiness.latitude ?? 0,
        longitude: matchingReadiness.longitude ?? 0,
        radiusMeters: matchingReadiness.radiusMeters ?? 0,
        serviceArea: matchingReadiness.serviceArea ?? '',
        schedule: matchingReadiness.schedule ?? [],
        online: value,
      });
      setMatchingReadiness(result);
    } catch (error) {
      Alert.alert(
        'Matching availability',
        error instanceof Error
          ? error.message
          : 'Unable to update matching availability',
      );
    }
  };

  const handleItemPress = (id: string) => {
    if (id === 'verification') {
      router.push({
        pathname: '/(worker)/verification',
        params: { from: 'profile' },
      });
      return;
    }
    if (id === 'areas') {
      router.push({
        pathname: '/(worker)/service-setup',
        params: { from: 'profile' },
      });
      return;
    }
    if (id === 'reviews') {
      router.push('/(worker)/reviews');
      return;
    }
    if (id === 'personal') {
      router.push({
        pathname: '/(worker)/personal-info',
        params: { from: 'profile' },
      });
      return;
    }
    if (id === 'industry') {
      router.push({
        pathname: '/(worker)/industry-skills',
        params: { from: 'profile' },
      });
      return;
    }
    if (id === 'portfolio') {
      Alert.alert(
        'Coming Soon',
        'Portfolio features will be available in a future update.',
      );
      return;
    }
    if (
      id === 'payout-methods' ||
      id === 'payout-history' ||
      id === 'topup-methods' ||
      id === 'topup-history'
    ) {
      Alert.alert(
        'Coming Soon',
        'This feature will be available in a future update.',
      );
      return;
    }
    if (id === 'notifications') {
      router.push('/notifications');
      return;
    }
    Alert.alert(
      'Coming Soon',
      'This feature will be available in a future update.',
    );
  };

  const handleLogout = () => {
    void supabase.auth.signOut().then(() => router.replace('/'));
  };

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <Text style={theme.typography.h2}>Profile</Text>
      </View>

      <View style={styles.content}>
        {!workerProfile && (
          <View style={styles.userInfo}>
            <Text
              style={[
                theme.typography.body2,
                {
                  color: loadError
                    ? theme.colors.error
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {loadError || 'Loading profile…'}
            </Text>
          </View>
        )}
        {workerProfile && (
          <>
            <View style={styles.userInfo}>
              <View style={styles.avatarWrapper}>
                <TouchableOpacity
                  onPress={chooseAvatar}
                  accessibilityLabel="Change profile photo"
                >
                  <Image
                    source={workerProfile.avatarUri || undefined}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editBadge}
                  onPress={chooseAvatar}
                  accessibilityLabel="Edit profile photo"
                >
                  <Pencil size={11} color={theme.colors.surface} />
                </TouchableOpacity>
              </View>
              <Text style={theme.typography.h3}>{workerProfile.name}</Text>
              <Text
                style={[
                  theme.typography.body2,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {workerProfile.email}
              </Text>
              <View style={styles.verifiedBadge}>
                <CheckCircle color={theme.colors.success} size={14} />
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color:
                        workerProfile.verificationStatus === 'rejected'
                          ? theme.colors.error
                          : theme.colors.success,
                      marginLeft: 4,
                    },
                  ]}
                >
                  {workerProfile.verificationStatus === 'verified'
                    ? 'Verified Worker'
                    : workerProfile.verificationStatus === 'rejected'
                      ? 'Verification Rejected'
                      : workerProfile.verificationStatus === 'needs_review'
                        ? 'Needs Document Review'
                        : 'Verification Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={theme.typography.h3}>
                  {workerProfile.completedJobs}
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Jobs Done
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Star color="#F59E0B" size={16} fill="#F59E0B" />
                  <Text style={[theme.typography.h3, { marginLeft: 4 }]}>
                    {formatRating(workerProfile.rating)}
                  </Text>
                </View>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Rating
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={theme.typography.h3}>
                  {workerProfile.earnings}
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Earnings
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={[theme.typography.h4, styles.infoSectionTitle]}>
                Availability
              </Text>
              <View style={styles.matchingCard}>
                <View style={styles.matchingRow}>
                  <View style={styles.matchingCopy}>
                    <Text
                      style={[
                        theme.typography.body2,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Turn this on when you are ready to receive requests.
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Available for matching"
                    value={matchingReadiness?.online ?? false}
                    disabled={!matchingReadiness?.setupComplete}
                    onValueChange={(value) => void toggleMatching(value)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                  />
                </View>
                {matchingReadiness?.matchable ? (
                  <Text
                    style={[
                      theme.typography.caption,
                      {
                        color: theme.colors.secondary,
                        marginTop: theme.spacing.xs,
                      },
                    ]}
                  >
                    Your profile is eligible for matching.
                  </Text>
                ) : null}
              </View>
            </View>

            {workerProfile.skills.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={[theme.typography.h4, styles.infoSectionTitle]}>
                  Skills
                </Text>
                <View style={styles.chipRow}>
                  {workerProfile.skills.slice(0, 4).map((skill: string) => (
                    <Chip key={skill} label={skill} size="sm" />
                  ))}
                  {workerProfile.skills.length > 4 && (
                    <Chip
                      label={`+${workerProfile.skills.length - 4}`}
                      size="sm"
                      selected
                    />
                  )}
                </View>
              </View>
            )}

            <View style={styles.infoCard}>
              <View style={styles.infoCardRow}>
                <View style={styles.infoCardItem}>
                  <DollarSign size={16} color={theme.colors.success} />
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: theme.colors.textSecondary, marginLeft: 6 },
                    ]}
                  >
                    Average Rate
                  </Text>
                </View>
                <Text style={theme.typography.body1}>
                  {workerProfile.hourlyRate}
                </Text>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.infoCardRow}>
                <View style={styles.infoCardItem}>
                  <Wrench size={16} color={theme.colors.info} />
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: theme.colors.textSecondary, marginLeft: 6 },
                    ]}
                  >
                    Industry
                  </Text>
                </View>
                <Text style={theme.typography.body1}>
                  {workerProfile.primaryIndustry || '—'}
                </Text>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.infoCardRow}>
                <View style={styles.infoCardItem}>
                  <MapPin size={16} color={theme.colors.warning} />
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: theme.colors.textSecondary, marginLeft: 6 },
                    ]}
                  >
                    Service Area
                  </Text>
                </View>
                <Text style={[theme.typography.body1, styles.infoCardValue]}>
                  {workerProfile.serviceAreas.slice(0, 2).join(', ')}
                  {workerProfile.serviceAreas.length > 2
                    ? ` +${workerProfile.serviceAreas.length - 2}`
                    : ''}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardRow}>
                <View style={styles.infoCardItem}>
                  <Briefcase size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: theme.colors.textSecondary, marginLeft: 6 },
                    ]}
                  >
                    Experience
                  </Text>
                </View>
                <Text style={theme.typography.body1}>
                  {workerProfile.yearsExperience} years
                </Text>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.infoCardRow}>
                <View style={styles.infoCardItem}>
                  <Star size={16} color="#F59E0B" />
                  <Text
                    style={[
                      theme.typography.body2,
                      { color: theme.colors.textSecondary, marginLeft: 6 },
                    ]}
                  >
                    Reviews
                  </Text>
                </View>
                <Text style={theme.typography.body1}>
                  {workerProfile.reviewCount} reviews
                </Text>
              </View>
            </View>

            {MENU_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={[theme.typography.h4, styles.sectionTitle]}>
                  {section.title}
                </Text>
                <View style={styles.card}>
                  {section.items.map((item, index) => {
                    const Icon = item.icon;
                    const isLast = index === section.items.length - 1;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.settingItem,
                          !isLast && styles.borderBottom,
                        ]}
                        onPress={() => handleItemPress(item.id)}
                      >
                        <View
                          style={[
                            styles.iconContainer,
                            { backgroundColor: `${theme.colors.primary}15` },
                          ]}
                        >
                          <Icon color={theme.colors.primary} size={20} />
                        </View>
                        <Text
                          style={[theme.typography.body1, styles.settingText]}
                        >
                          {item.title}
                        </Text>
                        <ChevronRight
                          color={theme.colors.textTertiary}
                          size={20}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color={theme.colors.error} size={20} />
              <Text
                style={[
                  theme.typography.button,
                  { color: theme.colors.error, marginLeft: theme.spacing.sm },
                ]}
              >
                Log Out
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  userInfo: { alignItems: 'center', marginVertical: theme.spacing.xl },
  avatarWrapper: { position: 'relative', alignSelf: 'center' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.xl,
  },
  statItem: { alignItems: 'center' },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.borderLight,
  },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingText: { flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.error}10`,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
  },
  infoSection: { marginBottom: theme.spacing.lg },
  infoSectionTitle: {
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCardItem: { flexDirection: 'row', alignItems: 'center' },
  infoCardValue: { flexShrink: 1, textAlign: 'right' },
  infoCardDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.sm,
  },
  matchingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  matchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  matchingCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
});
