import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/Avatar';
import { theme } from '@/constants/theme';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { showAlert } from '@/components/AppAlert';
import { styles } from '@/styles/worker/profile.styles';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { id: 'personal', title: 'Personal Information', icon: User, color: theme.colors.primary },
      { id: 'industry', title: 'Industry & Skills', icon: Wrench, color: theme.colors.success },
      { id: 'areas', title: 'Service Areas', icon: MapPin, color: theme.colors.info },
    ],
  },
  {
    title: 'Reviews',
    items: [
      { id: 'reviews', title: 'My Reviews', icon: Star, color: theme.colors.warning },
    ],
  },
  {
    title: 'Payments',
    items: [
      { id: 'payout-methods', title: 'Payout Methods', icon: Wallet, color: theme.colors.secondary },
      { id: 'payout-history', title: 'Payout History', icon: Clock, color: theme.colors.textSecondary },
      { id: 'topup-methods', title: 'Top-Up Methods', icon: ArrowUpFromLine, color: theme.colors.info },
      { id: 'topup-history', title: 'Top-Up History', icon: PlusCircle, color: theme.colors.success },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'notifications', title: 'Notifications', icon: Bell, color: theme.colors.warning },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      { id: 'verification', title: 'Verification', icon: BadgeCheck, color: theme.colors.success },
      { id: 'help', title: 'Help Center', icon: HelpCircle, color: theme.colors.primaryLight },
      { id: 'privacy', title: 'Privacy Policy', icon: Shield, color: theme.colors.textSecondary },
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
      showAlert(
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
        online: value,
      });
      setMatchingReadiness(result);
    } catch (error) {
      showAlert(
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
    if (
      id === 'payout-methods' ||
      id === 'payout-history' ||
      id === 'topup-methods' ||
      id === 'topup-history'
    ) {
      showAlert(
        'Coming Soon',
        'This feature will be available in a future update.',
      );
      return;
    }
    if (id === 'notifications') {
      router.push('/notifications');
      return;
    }
    if (id === 'help') {
      router.push({
        pathname: '/(worker)/help-center',
        params: { from: 'profile' },
      });
      return;
    }
    if (id === 'privacy') {
      router.push({
        pathname: '/(worker)/privacy-policy',
        params: { from: 'profile' },
      });
      return;
    }
    showAlert(
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
                  <Avatar
                    uri={workerProfile.avatarUri}
                    name={workerProfile.name}
                    size={88}
                    style={{ marginBottom: theme.spacing.sm }}
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
                            { backgroundColor: `${item.color}15` },
                          ]}
                        >
                          <Icon color={item.color} size={20} />
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
