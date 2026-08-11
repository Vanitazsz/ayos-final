import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { TextInput } from '@/components/inputs/TextInput';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';

import {
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  MapPin,
  Fingerprint,
  Languages,
  Info,
  Save,
  CheckCircle2,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { fetchCustomerProfile } from '@/services/api';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { updateMyProfile, uploadMyAvatar } from '@/services/profile';
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
      {
        id: 'language',
        title: 'Message Language',
        icon: Languages,
        route: '/settings/language',
        color: theme.colors.secondary,
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
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchCustomerProfile();
    if (result.error) {
      setLoadError(result.error);
      setProfile(null);
      return;
    }
    setProfile(result.data);
    setName(result.data.name ?? '');
    setMobile(user?.phone ?? '');
    setLoadError('');
  }, [user?.phone]);

  useEffect(() => {
    void load();
  }, [load]);

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
    } catch (error) {
      showAlert(
        'Profile photo',
        error instanceof Error
          ? error.message
          : 'Unable to update profile photo',
      );
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      showAlert('Full Name Required', 'Please enter your full name before saving.');
      return;
    }
    try {
      setIsSaving(true);
      const normalizedMobile = mobile.trim().startsWith('0')
        ? `+63${mobile.trim().slice(1)}`
        : mobile.trim();
      const updated = await updateMyProfile({
        displayName: name.trim(),
        mobile: normalizedMobile || null,
        complete: true,
      });
      setProfile((current: any) => ({
        ...current,
        name: updated.displayName,
        profileComplete: updated.profileComplete,
      }));
      showAlert(
        'Profile Saved Successfully!',
        'Your profile details have been saved. You can now freely navigate to all app pages.',
      );
    } catch (error) {
      showAlert(
        'Profile Update Failed',
        error instanceof Error ? error.message : 'Unable to update profile details',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingPress = (route: string) => {
    if (profile && !profile.profileComplete) {
      showAlert(
        'Save Required First',
        'Please save your profile details first by tapping the highlighted "SAVE PROFILE DETAILS" button above.',
      );
      return;
    }
    router.push(route as any);
  };

  const handleLogout = () => {
    void supabase.auth.signOut().then(() => {
      logout();
      router.replace('/');
    });
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
              <TouchableOpacity
                onPress={chooseAvatar}
                accessibilityLabel="Change profile photo"
              >
                <Image
                  source={profile.avatarUri || undefined}
                  style={styles.avatar}
                  contentFit="cover"
                />
              </TouchableOpacity>
              <Text style={theme.typography.h3}>{profile.name || 'New Customer'}</Text>
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

            {/* New Account Instruction Banner */}
            {!profile.profileComplete && (
              <View style={styles.guidanceCard}>
                <View style={styles.guidanceHeader}>
                  <Info size={20} color="#1E40AF" />
                  <Text style={styles.guidanceTitle}>
                    📍 Important Instruction for New Accounts
                  </Text>
                </View>
                <Text style={styles.guidanceText}>
                  Welcome! Please enter your Full Name and Mobile Number below, then tap the highlighted <Text style={{ fontWeight: '800', color: theme.colors.primary }}>SAVE PROFILE DETAILS</Text> button first before navigating to other pages.
                </Text>
              </View>
            )}

            {/* Complete Profile Card with Highlighted Save Button */}
            {!profile.profileComplete && (
              <View style={styles.editCardHighlight}>
                <Text style={[theme.typography.h4, { marginBottom: theme.spacing.sm }]}>
                  Complete Your Profile Details
                </Text>

                <Text style={styles.fieldLabel}>FULL NAME *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  style={styles.inputStyle}
                />

                <Text style={[styles.fieldLabel, { marginTop: theme.spacing.sm }]}>
                  MOBILE NUMBER (+63...) *
                </Text>
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="e.g. 09171234567 or +639171234567"
                  keyboardType="phone-pad"
                  style={styles.inputStyle}
                />

                <View style={styles.highlightedSaveContainer}>
                  <TouchableOpacity
                    style={styles.highlightedSaveBtn}
                    onPress={saveProfile}
                    activeOpacity={0.85}
                    disabled={isSaving}
                  >
                    <Save size={20} color="#FFFFFF" />
                    <Text style={styles.highlightedSaveBtnText}>
                      {isSaving ? 'SAVING DETAILS…' : 'SAVE PROFILE DETAILS'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.saveNoticeText}>
                    👇 Tap the button above to save before viewing other pages
                  </Text>
                </View>
              </View>
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
                        {!profile.profileComplete && (
                          <View style={styles.badgeSaveFirst}>
                            <Text style={styles.badgeSaveFirstText}>Save First</Text>
                          </View>
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
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    borderWidth: 3,
    borderColor: theme.colors.surface,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: `${theme.colors.error}10`,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
  },
  guidanceCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: theme.radius.xl,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  guidanceTitle: {
    ...theme.typography.body1,
    fontWeight: '700',
    color: '#1E40AF',
  },
  guidanceText: {
    ...theme.typography.body2,
    color: '#1E3A8A',
    lineHeight: 20,
  },
  editCardHighlight: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.md,
  },
  fieldLabel: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  inputStyle: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  highlightedSaveContainer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  highlightedSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    width: '100%',
    ...theme.shadows.md,
  },
  highlightedSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  saveNoticeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  badgeSaveFirst: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    marginRight: theme.spacing.xs,
  },
  badgeSaveFirstText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: '#D97706',
  },
});
