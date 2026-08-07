import React, { useEffect, useState } from 'react';
import {View,
  Text,
  StyleSheet,
  TouchableOpacity,} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
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
  const load = async () => {
    const result = await fetchCustomerProfile();
    if (result.error) {
      setLoadError(result.error);
      setProfile(null);
      return;
    }
    setProfile(result.data);
    setName(result.data.name);
    setMobile(user?.phone ?? '');
    setLoadError('');
  };
  useEffect(() => {
    void load();
  }, []);

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
    try {
      const normalizedMobile = mobile.startsWith('0')
        ? `+63${mobile.slice(1)}`
        : mobile;
      const updated = await updateMyProfile({
        displayName: name,
        mobile: normalizedMobile || null,
        complete: true,
      });
      setProfile((current: any) => ({
        ...current,
        name: updated.displayName,
        profileComplete: updated.profileComplete,
      }));
    } catch (error) {
      showAlert(
        'Profile update',
        error instanceof Error ? error.message : 'Unable to update profile',
      );
    }
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
              <Text style={theme.typography.h3}>{profile.name}</Text>
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
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    backgroundColor:
                      profile.verificationStatus === 'verified'
                        ? `${theme.colors.success}15`
                        : profile.verificationStatus === 'rejected'
                          ? `${theme.colors.error}15`
                          : theme.colors.warningBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    theme.typography.caption,
                    {
                      color:
                        profile.verificationStatus === 'verified'
                          ? theme.colors.success
                          : profile.verificationStatus === 'rejected'
                            ? theme.colors.error
                            : theme.colors.warning,
                    },
                  ]}
                >
                  {profile.verificationStatus === 'verified'
                    ? '✓ Identity verified'
                    : profile.verificationStatus === 'pending'
                      ? 'Identity review pending'
                      : profile.verificationStatus === 'rejected'
                        ? 'Identity verification rejected'
                        : 'Identity not verified'}
                </Text>
              </View>
            </View>

            {!profile.profileComplete && (
              <View style={styles.editCard}>
                <Text style={theme.typography.h4}>
                  Complete your profile
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                />
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Mobile number"
                  keyboardType="phone-pad"
                />
                <View style={styles.editActions}>
                  <Button title="Save" onPress={saveProfile} />
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
                        onPress={() => router.push(item.route as any)}
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
  editCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
