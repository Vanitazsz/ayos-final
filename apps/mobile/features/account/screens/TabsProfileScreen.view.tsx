import { styles } from './TabsProfileScreen.styles';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput as NativeTextInput,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import {
  ChevronRight,
  Shield,
  Bell,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  MapPin,
  Heart,
  BookOpen,
  Fingerprint,
  Languages,
} from 'lucide-react-native';
import type { useTabsProfileScreenController } from '../hooks/useTabsProfileScreenController';
const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        id: 'personal',
        title: 'Personal Information',
        icon: Fingerprint,
        route: '/(tabs)/profile',
      },
      {
        id: 'identity',
        title: 'Identity Verification',
        icon: Shield,
        route: '/(auth)/verify-identity',
      },
      {
        id: 'addresses',
        title: 'Saved Addresses',
        icon: MapPin,
        route: '/settings/addresses',
      },
      {
        id: 'favorites',
        title: 'Favorite Workers',
        icon: Heart,
        route: '/(tabs)/profile',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        id: 'payment-methods',
        title: 'Payment Methods',
        icon: CreditCard,
        route: '/(tabs)/profile',
      },
      {
        id: 'history',
        title: 'Payment History',
        icon: BookOpen,
        route: '/(tabs)/profile',
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
        route: '/(tabs)/profile',
      },
      {
        id: 'language',
        title: 'Message Language',
        icon: Languages,
        route: '/settings/language',
      },
      {
        id: 'appearance',
        title: 'App Appearance',
        icon: Settings,
        route: '/(tabs)/profile',
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
      },
      {
        id: 'privacy',
        title: 'Privacy Policy',
        icon: Shield,
        route: '/(tabs)/privacy-policy',
      },
    ],
  },
];
export function ProfileView({
  model,
}: {
  model: ReturnType<typeof useTabsProfileScreenController>;
}) {
  const {
    router,
    profile,
    loadError,
    editing,
    setEditing,
    name,
    setName,
    mobile,
    setMobile,
    chooseAvatar,
    saveProfile,
    handleLogout,
    Image,
  } = model;
  return (
    <Screen safeArea scrollable>
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

            {(editing || !profile.profileComplete) && (
              <View style={styles.editCard}>
                <Text style={theme.typography.h4}>
                  {profile.profileComplete
                    ? 'Personal Information'
                    : 'Complete your profile'}
                </Text>
                <NativeTextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                />
                <NativeTextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Mobile number"
                  keyboardType="phone-pad"
                />
                <View style={styles.editActions}>
                  {profile.profileComplete && (
                    <Button
                      title="Cancel"
                      variant="outlined"
                      onPress={() => setEditing(false)}
                    />
                  )}
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
                        onPress={() =>
                          item.id === 'personal'
                            ? setEditing(true)
                            : router.push(item.route as any)
                        }
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
