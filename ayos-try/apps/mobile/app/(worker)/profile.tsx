import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput as NativeTextInput,
} from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
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
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  Star,
  CheckCircle,
  BadgeCheck,
  ArrowUpFromLine,
  PlusCircle,
} from 'lucide-react-native';
import { fetchWorkerProfile } from '@/services/api';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '@/services/profile';
import { AppSelect } from '@/components/AppSelect';
import {
  fetchActiveSubdivisions,
  setMySubdivision,
  type Subdivision,
} from '@/services/subdivisions';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { id: 'personal', title: 'Personal Information', icon: User },
      { id: 'industry', title: 'Industry & Skills', icon: Wrench },
      { id: 'areas', title: 'Service Areas', icon: MapPin },
      { id: 'portfolio', title: 'Portfolio', icon: Briefcase },
      { id: 'verification', title: 'Verification', icon: BadgeCheck },
      { id: 'reviews', title: 'My Reviews', icon: Star },
    ],
  },
  {
    title: 'Payments',
    items: [
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
      { id: 'appearance', title: 'App Appearance', icon: Settings },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      { id: 'help', title: 'Help Center', icon: HelpCircle },
      { id: 'privacy', title: 'Privacy Policy', icon: Shield },
    ],
  },
];

export default function WorkerProfileScreen() {
  const router = useRouter();
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [bio, setBio] = useState('');
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [subdivisionId, setSubdivisionId] = useState('');
  const load = async () => {
    setLoadError('');
    try {
      const result = await fetchWorkerProfile();
      if (result.error || !result.data) {
        throw new Error(result.error ?? 'Worker profile is not active');
      }

      let accountProfile: Awaited<ReturnType<typeof getMyProfile>> | null = null;
      try {
        accountProfile = await getMyProfile();
      } catch {
        // The worker profile data is sufficient to render this screen. Account
        // details are optional here and may be unavailable during migrations.
      }
      if (accountProfile?.role && accountProfile.role !== 'WORKER') {
        throw new Error('Worker profile is not active');
      }

      let areas: Subdivision[] = [];
      try {
        areas = await fetchActiveSubdivisions();
      } catch {
        // Subdivisions are only needed by the edit form and must not block the profile.
      }

      const workerAccountProfile =
        accountProfile?.role === 'WORKER' ? accountProfile : null;
      const selected = areas.find(
        (item) => item.id === workerAccountProfile?.subdivisionId,
      );
      setSubdivisions(areas);
      setSubdivisionId(workerAccountProfile?.subdivisionId ?? '');
      setWorkerProfile({ ...result.data, subdivisionName: selected?.name ?? '' });
      setName(result.data.name);
      setMobile(workerAccountProfile?.mobile ?? '');
      setServiceArea(
        workerAccountProfile?.serviceArea ?? result.data.serviceAreas[0] ?? '',
      );
      setBio(workerAccountProfile?.bio ?? result.data.bio ?? '');
    } catch (error) {
      setWorkerProfile(null);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load worker profile',
      );
    }
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
  const saveProfile = async () => {
    try {
      const normalizedMobile = mobile.startsWith('0')
        ? `+63${mobile.slice(1)}`
        : mobile;
      await updateMyProfile({
        displayName: name,
        mobile: normalizedMobile || null,
        location: serviceArea || null,
        bio: bio || null,
        complete: true,
      });
      if (subdivisionId) await setMySubdivision(subdivisionId);
      await load();
      setEditing(false);
    } catch (error) {
      Alert.alert(
        'Profile update',
        error instanceof Error ? error.message : 'Unable to update profile',
      );
    }
  };

  const handleItemPress = (id: string) => {
    if (id === 'verification') {
      router.push('/(worker)/verification');
      return;
    }
    if (id === 'areas') {
      router.push('/(worker)/service-setup');
      return;
    }
    if (id === 'reviews') {
      router.push('/(worker)/reviews');
      return;
    }
    if (id === 'personal') {
      setEditing(true);
      return;
    }
    if (id === 'industry') {
      router.push('/(worker)/service-setup');
      return;
    }
    if (id === 'portfolio') {
      Alert.alert('Coming Soon', 'Portfolio features will be available in a future update.');
      return;
    }
    if (id === 'payout-methods' || id === 'payout-history') {
      router.push('/(worker)/wallet');
      return;
    }
    if (id === 'topup-methods' || id === 'topup-history') {
      router.push('/(worker)/wallet');
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
    <Screen safeArea scrollable>
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
              <Text style={theme.typography.h3}>{workerProfile.name}</Text>
              <Text
                style={[
                  theme.typography.body2,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {workerProfile.email}
              </Text>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textSecondary, marginTop: 4 },
                ]}
              >
                {workerProfile.subdivisionName || 'Subdivision not set'}
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
                      : 'Verification Pending'}
                </Text>
              </View>
            </View>

            {(editing || !workerProfile.profileComplete) && (
              <View style={styles.editCard}>
                <Text style={theme.typography.h4}>
                  {workerProfile.profileComplete
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
                <NativeTextInput
                  style={styles.input}
                  value={serviceArea}
                  onChangeText={setServiceArea}
                  placeholder="Service area"
                />
                <AppSelect
                  label="Subdivision"
                  value={subdivisionId}
                  onSelect={setSubdivisionId}
                  options={subdivisions.map((item) => ({
                    label: item.name,
                    value: item.id,
                  }))}
                  placeholder="Select subdivision"
                  containerStyle={{ marginTop: theme.spacing.md }}
                />
                <NativeTextInput
                  style={[
                    styles.input,
                    { minHeight: 96, textAlignVertical: 'top' },
                  ]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Professional bio"
                  multiline
                />
                <View style={styles.editActions}>
                  {workerProfile.profileComplete && (
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
                    {workerProfile.rating}
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
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
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
  editCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
