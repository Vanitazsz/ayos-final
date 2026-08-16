import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { ToneCard } from '@/components/ToneCard';
import { theme } from '@/constants/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkerProfile } from '@/hooks/useProfile';
import {
  ChevronRight,
  User,
  Wrench,
  MapPin,
  Briefcase,
  // Wallet, // Payments section hidden
  // Clock, // Payments section hidden
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  CheckCircle,
  BadgeCheck,
  Wallet,
  // ArrowUpFromLine, // Payments section hidden
  // PlusCircle, // Payments section hidden
  DollarSign,
  Pencil,
  Upload,
  Trash2,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { getMyProfile, removeMyAvatar, uploadMyAvatar } from '@/services/profile';
import { Chip } from '@/components/Chip';
import {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
} from '@/services/workerMatching';
import { showAlert } from '@/components/AppAlert';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationsGate } from '@/hooks/useNotificationsGate';
import { styles } from '@/styles/worker/profile.styles';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        id: 'personal',
        title: 'Personal Information',
        icon: User,
        color: theme.colors.primary,
      },
      {
        id: 'industry',
        title: 'Industry & Skills',
        icon: Wrench,
        color: theme.colors.success,
      },
      {
        id: 'areas',
        title: 'Service Areas',
        icon: MapPin,
        color: theme.colors.info,
      },
      {
        id: 'wallet',
        title: 'Wallet',
        icon: Wallet,
        color: '#8b5cf6',
      },
    ],
  },
  // {
  //   title: 'Payments',
  //   items: [
  //     {
  //       id: 'payout-methods',
  //       title: 'Payout Methods',
  //       icon: Wallet,
  //       color: theme.colors.secondary,
  //     },
  //     {
  //       id: 'payout-history',
  //       title: 'Payout History',
  //       icon: Clock,
  //       color: theme.colors.textSecondary,
  //     },
  //     {
  //       id: 'topup-methods',
  //       title: 'Top-Up Methods',
  //       icon: ArrowUpFromLine,
  //       color: theme.colors.info,
  //     },
  //     {
  //       id: 'topup-history',
  //       title: 'Top-Up History',
  //       icon: PlusCircle,
  //       color: theme.colors.success,
  //     },
  //   ],
  // },
  {
    title: 'Preferences',
    items: [
      {
        id: 'notifications',
        title: 'Notifications',
        icon: Bell,
        color: theme.colors.warning,
      },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      {
        id: 'verification',
        title: 'Verification',
        icon: BadgeCheck,
        color: theme.colors.success,
      },
      {
        id: 'help',
        title: 'Help Center',
        icon: HelpCircle,
        color: theme.colors.primaryLight,
      },
      {
        id: 'privacy',
        title: 'Privacy Policy',
        icon: Shield,
        color: theme.colors.textSecondary,
      },
    ],
  },
];

export default function WorkerProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const openNotifications = useNotificationsGate();
  const queryClient = useQueryClient();
  const profileQuery = useWorkerProfile();
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [matchingReadiness, setMatchingReadiness] =
    useState<WorkerMatchingReadiness | null>(null);
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setWorkerProfile(profileQuery.data);
      setLoadError('');
    }
    if (profileQuery.error) {
      setWorkerProfile(null);
      setLoadError(
        profileQuery.error instanceof Error
          ? profileQuery.error.message
          : 'Unable to load worker profile',
      );
    }
  }, [profileQuery.data, profileQuery.error]);

  const {
    isLoading: profileLoading,
    isStale: profileStale,
    refetch: refetchProfile,
  } = profileQuery;

  useFocusEffect(
    useCallback(() => {
      if (!profileLoading && profileStale) {
        void refetchProfile();
      }
      let active = true;
      void (async () => {
        try {
          let accountProfile: Awaited<ReturnType<typeof getMyProfile>> | null =
            null;
          try {
            accountProfile = await getMyProfile();
          } catch {
            // The worker profile data is sufficient to render this screen.
            // Account details are optional here and may be unavailable during
            // migrations.
          }
          if (accountProfile?.role && accountProfile.role !== 'WORKER') {
            throw new Error('Worker profile is not active');
          }

          let readiness: WorkerMatchingReadiness | null = null;
          try {
            readiness = await getWorkerMatchingReadiness();
          } catch {
            // Matching availability is optional here and must not block the
            // profile.
          }
          if (active) setMatchingReadiness(readiness);
        } catch (error) {
          if (active) {
            setWorkerProfile(null);
            setLoadError(
              error instanceof Error
                ? error.message
                : 'Unable to load worker profile',
            );
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [profileLoading, profileStale, refetchProfile]),
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
      void queryClient.invalidateQueries({ queryKey: ['worker', 'profile'] });
    } catch (error) {
      showAlert(
        'Profile photo',
        error instanceof Error
          ? error.message
          : 'Unable to update profile photo',
      );
    }
  };
  const removeAvatar = async () => {
    try {
      const updated = await removeMyAvatar();
      setWorkerProfile((current: any) => ({
        ...current,
        avatarUri: updated.avatarUri,
      }));
      void queryClient.invalidateQueries({ queryKey: ['worker', 'profile'] });
    } catch (error) {
      showAlert(
        'Profile photo',
        error instanceof Error
          ? error.message
          : 'Unable to remove profile photo',
      );
    }
  };
  const openPhotoMenu = () => {
    setPhotoMenuVisible(true);
  };
  const closePhotoMenu = () => {
    setPhotoMenuVisible(false);
  };
  const handleAvatarPress = () => {
    if (workerProfile?.avatarUri) {
      setPreviewVisible(true);
      return;
    }
    openPhotoMenu();
  };
  const handleUploadPhoto = () => {
    closePhotoMenu();
    void chooseAvatar();
  };
  const handleRemovePhoto = () => {
    closePhotoMenu();
    void removeAvatar();
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
    if (id === 'wallet') {
      router.push({
        pathname: '/(worker)/wallet',
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
      openNotifications();
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
    void supabase.auth.signOut().then(() => logout());
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
                  onPress={handleAvatarPress}
                  accessibilityLabel="View profile photo"
                >
                  <Avatar
                    uri={workerProfile.avatarUri}
                    name={workerProfile.name}
                    size={88}
                    style={{
                      borderWidth: 3,
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.infoBackground,
                      marginBottom: theme.spacing.sm,
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editBadge}
                  onPress={openPhotoMenu}
                  accessibilityLabel="Edit profile photo"
                >
                  <Pencil size={14} color={theme.colors.surface} />
                </TouchableOpacity>
                {photoMenuVisible && (
                  <>
                    <Pressable
                      style={styles.photoMenuBackdrop}
                      onPress={closePhotoMenu}
                      accessibilityLabel="Close profile photo menu"
                    />
                    <View style={styles.photoMenu}>
                      {workerProfile?.avatarUri && (
                        <>
                          <TouchableOpacity
                            style={styles.photoMenuItem}
                            onPress={handleRemovePhoto}
                            accessibilityLabel="Remove profile picture"
                          >
                            <Trash2 size={18} color={theme.colors.error} />
                            <Text
                              style={[
                                theme.typography.body1,
                                { color: theme.colors.error },
                              ]}
                            >
                              Remove profile picture
                            </Text>
                          </TouchableOpacity>
                          <View style={styles.photoMenuDivider} />
                        </>
                      )}
                      <TouchableOpacity
                        style={styles.photoMenuItem}
                        onPress={handleUploadPhoto}
                        accessibilityLabel="Upload profile picture"
                      >
                        <Upload size={18} color={theme.colors.primary} />
                        <Text
                          style={[
                            theme.typography.body1,
                            { color: theme.colors.textPrimary },
                          ]}
                        >
                          Upload profile picture
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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

              {/* Service Area Setup Guidance Banner */}
              {(!matchingReadiness?.skillsReady ||
                !matchingReadiness?.rateReady ||
                !matchingReadiness?.serviceAreaReady) && (
                <ToneCard
                  tone="warning"
                  icon={<MapPin size={16} color={theme.colors.warning} />}
                  title="Setup Required to Enable Matching"
                  body="To enable matching availability and start receiving service requests, please go to the Service Areas page under Account to set up your work location and radius."
                  style={{ marginBottom: theme.spacing.md }}
                />
              )}

              {matchingReadiness?.skillsReady &&
                matchingReadiness?.rateReady &&
                matchingReadiness?.serviceAreaReady &&
                matchingReadiness?.verificationStatus === 'PENDING' && (
                  <ToneCard
                    tone="info"
                    icon={<Shield size={16} color={theme.colors.info} />}
                    title="Waiting for Admin Verification"
                    body="Your account setup is complete. You'll start receiving service requests once an administrator approves your verification."
                    style={{ marginBottom: theme.spacing.md }}
                  />
                )}

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
                    ✓ Your profile is eligible for matching.
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleItemPress('areas')}
                    style={{ marginTop: theme.spacing.xs }}
                  >
                    <Text
                      style={[
                        theme.typography.caption,
                        {
                          color: theme.colors.error,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      Matching disabled: Tap here to configure Service Area &
                      Radius.
                    </Text>
                  </TouchableOpacity>
                )}
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
                        {item.id === 'areas' &&
                          !matchingReadiness?.setupComplete && (
                            <Badge
                              label="Setup Needed"
                              variant="warning"
                              style={{
                                alignSelf: 'center',
                                marginRight: theme.spacing.xs,
                              }}
                            />
                          )}
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

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewVisible(false)}
        >
          {workerProfile?.avatarUri ? (
            <Image
              source={{ uri: workerProfile.avatarUri }}
              style={styles.previewImage}
              accessibilityLabel="Profile picture preview"
            />
          ) : null}
          <Pressable
            style={styles.previewClose}
            onPress={() => setPreviewVisible(false)}
            accessibilityLabel="Close profile picture preview"
            hitSlop={8}
          >
            <X size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
