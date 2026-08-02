import { styles } from './WorkerProfileScreen.styles';
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
import { AppSelect } from '@/components/AppSelect';
import type { useWorkerProfileScreenController } from '../hooks/useWorkerProfileScreenController';
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
export function WorkerProfileView({
  model,
}: {
  model: ReturnType<typeof useWorkerProfileScreenController>;
}) {
  const {
    workerProfile,
    loadError,
    editing,
    setEditing,
    name,
    setName,
    mobile,
    setMobile,
    serviceArea,
    setServiceArea,
    bio,
    setBio,
    subdivisions,
    subdivisionId,
    setSubdivisionId,
    chooseAvatar,
    saveProfile,
    handleItemPress,
    handleLogout,
    formatRating,
    Image,
  } = model;
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
                      : workerProfile.verificationStatus === 'needs_review'
                        ? 'Needs Document Review'
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
