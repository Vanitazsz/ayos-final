import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Badge } from '@/components/Badge';
import { ToneCard } from '@/components/ToneCard';
import { Avatar } from '@/components/Avatar';
import { AppText } from '@/components/AppText';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerProfile } from '@/hooks/useProfile';
import { useNotificationsGate } from '@/hooks/useNotificationsGate';

import {
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  MapPin,
  Fingerprint,
  Pencil,
  Upload,
  Trash2,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { removeMyAvatar, uploadMyAvatar } from '@/services/profile';
import { showAlert } from '@/components/AppAlert';

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        id: 'personal',
        title: 'Personal Information',
        icon: Fingerprint,
        route: '/(tabs)/personal-info',
        color: theme.colors.primary,
      },
      {
        id: 'identity',
        title: 'Identity Verification',
        icon: Shield,
        route: '/(auth)/verify-identity',
        color: theme.colors.success,
      },
      {
        id: 'addresses',
        title: 'Saved Addresses',
        icon: MapPin,
        route: '/settings/addresses',
        color: theme.colors.info,
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        id: 'notifications',
        title: 'Notifications',
        icon: Bell,
        route: '/notifications',
        color: theme.colors.warning,
      },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      {
        id: 'help',
        title: 'Help Center',
        icon: HelpCircle,
        route: '/(tabs)/help-center',
        color: theme.colors.primaryLight,
      },
      {
        id: 'privacy',
        title: 'Privacy Policy',
        icon: Shield,
        route: '/(tabs)/privacy-policy',
        color: theme.colors.textSecondary,
      },
    ],
  },
];

export default function ProfileScreen() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const openNotifications = useNotificationsGate();
  const queryClient = useQueryClient();
  const profileQuery = useCustomerProfile();
  const [profile, setProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [photoMenuVisible, setPhotoMenuVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
      setLoadError('');
    }
    if (profileQuery.error) {
      setProfile(null);
      setLoadError(
        profileQuery.error instanceof Error
          ? profileQuery.error.message
          : 'Unable to load profile',
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
    }, [profileLoading, profileStale, refetchProfile]),
  );

  const invalidateProfile = () => {
    void queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
  };

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
      setProfile((current: any) => ({
        ...current,
        avatarUri: updated.avatarUri,
      }));
      invalidateProfile();
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
      setProfile((current: any) => ({
        ...current,
        avatarUri: updated.avatarUri,
      }));
      invalidateProfile();
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
    if (profile?.avatarUri) {
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

  const handleSettingPress = (route: string) => {
    if (route === '/notifications') {
      openNotifications();
      return;
    }
    if (
      profile &&
      !profile.profileComplete &&
      route !== '/(tabs)/personal-info'
    ) {
      showAlert(
        'Save Required First',
        'Please complete your profile details under Personal Information before accessing this page.',
      );
      return;
    }
    router.push(route as any);
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
        {!profile && (
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
        {profile && (
          <>
            <View style={styles.userInfo}>
              <View style={styles.avatarWrapper}>
                <TouchableOpacity
                  onPress={handleAvatarPress}
                  accessibilityLabel="View profile photo"
                >
                  <Avatar
                    uri={profile.avatarUri}
                    name={profile.name}
                    size={96}
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
                      {profile?.avatarUri && (
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
              <Text style={theme.typography.h3}>
                {profile.name || 'New Customer'}
              </Text>
              <Text
                style={[
                  theme.typography.body2,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {profile.email}
              </Text>
              {profile.subdivisionName ? (
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textSecondary, marginTop: 4 },
                  ]}
                >
                  {profile.subdivisionName}
                </Text>
              ) : null}
              <View style={styles.verifiedBadge}>
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color: profile.emailVerified
                        ? theme.colors.success
                        : theme.colors.warning,
                    },
                  ]}
                >
                  {profile.emailVerified
                    ? '✓ Email verified'
                    : 'Email verification pending'}
                </Text>
              </View>
            </View>

            {!profile.profileComplete && (
              <ToneCard
                tone="info"
                icon={<Fingerprint size={16} color={theme.colors.info} />}
                title="Save Your Profile"
                body="Please go to Personal Information under Account to save your Full Name and Mobile Number."
                style={{ marginBottom: theme.spacing.md }}
              />
            )}

            {profile.profileComplete &&
              (!profile.defaultAddress ||
                (profile.verificationStatus !== 'verified' &&
                  profile.verificationStatus !== 'pending')) && (
                <ToneCard
                  tone="info"
                  icon={<MapPin size={16} color={theme.colors.info} />}
                  title="Finish Setup to Start Booking"
                  body="You can only book services once you have saved an address and completed identity verification."
                  style={{ marginBottom: theme.spacing.md }}
                >
                  {!profile.defaultAddress && (
                    <Pressable onPress={() => router.push('/settings/addresses')}>
                      <AppText
                        variant="caption"
                        weight="bold"
                        color={theme.colors.primary}
                        style={styles.cardLink}
                      >
                        Add your saved address
                      </AppText>
                    </Pressable>
                  )}
                  {profile.verificationStatus !== 'verified' &&
                    profile.verificationStatus !== 'pending' && (
                      <Pressable
                        onPress={() => router.push('/(auth)/verify-identity')}
                      >
                        <AppText
                          variant="caption"
                          weight="bold"
                          color={theme.colors.primary}
                          style={styles.cardLink}
                        >
                          Verify your identity
                        </AppText>
                      </Pressable>
                    )}
                </ToneCard>
              )}

            {profile.profileComplete &&
              profile.verificationStatus === 'pending' && (
                <ToneCard
                  tone="info"
                  icon={<Shield size={16} color={theme.colors.info} />}
                  title="Identity Verification Pending"
                  body="Your submitted ID is under admin review. You can book services once it has been approved."
                  style={{ marginBottom: theme.spacing.md }}
                />
              )}

            {SETTINGS_SECTIONS.map((section) => (
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
                        onPress={() => handleSettingPress(item.route)}
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
                        {!profile.profileComplete &&
                          item.id !== 'personal' && (
                            <Badge
                              label="Save First"
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
          {profile?.avatarUri ? (
            <Image
              source={{ uri: profile.avatarUri }}
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

const styles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.layout.screenPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxxl,
  },
  userInfo: { alignItems: 'center', marginVertical: theme.spacing.xl },
  avatarWrapper: { position: 'relative', alignSelf: 'center' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMenuBackdrop: {
    position: 'absolute',
    top: -300,
    bottom: -300,
    left: -300,
    right: -300,
    backgroundColor: 'transparent',
    zIndex: 999,
    elevation: 10,
  },
  photoMenu: {
    position: 'absolute',
    top: 104,
    right: 0,
    minWidth: 220,
    zIndex: 1000,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.shadows.lg,
    elevation: 20,
    paddingVertical: theme.spacing.xs,
    overflow: 'hidden',
  },
  photoMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  photoMenuDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: theme.spacing.md,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  previewImage: {
    width: 320,
    height: 320,
    maxWidth: '90%',
    maxHeight: '70%',
    borderRadius: 160,
    borderWidth: 3,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.infoBackground,
  },
  previewClose: {
    position: 'absolute',
    top: theme.spacing.xxl,
    right: theme.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    backgroundColor: `${theme.colors.success}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.xs,
  },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    ...theme.shadows.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
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
  cardLink: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.error}10`,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
  },
});
