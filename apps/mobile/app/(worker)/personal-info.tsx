import React, { useEffect, useState } from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, TriangleAlert } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/layout/Screen';
import {
  Colors,
  Elevation,
  Radius,
  Spacing,
  Typography,
  theme,
} from '@/constants/theme';
import {
  getMyProfile,
  updateMyProfile,
  type WorkerProfileView,
} from '@/services/profile';
import { getBackRoute } from '@/constants/backRoutes';
import { useGoBack } from '@/hooks/useGoBack';
import { showAlert } from '@/components/AppAlert';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = useGoBack('/(worker)/profile');
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else goBack();
  };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [accountProfile, setAccountProfile] =
    useState<WorkerProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getMyProfile();
        if (!active) return;
        const account = profile.role === 'WORKER' ? profile : null;
        setName(profile.displayName);
        setEmail(profile.email);
        setBio(profile.bio ?? '');
        setAccountProfile(account);
        setPhone(account?.mobile ?? '');
      } catch {
        // Account details are optional here and may be unavailable during migrations.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      showAlert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const normalizedMobile = phone.trim().startsWith('0')
        ? `+63${phone.trim().slice(1)}`
        : phone.trim();
      await updateMyProfile({
        displayName: name,
        mobile: normalizedMobile || null,
        location: accountProfile?.serviceArea ?? null,
        bio: bio || null,
        complete: true,
      });
      showAlert('Saved', 'Your personal information has been updated.', [
        { text: 'OK', onPress: handleBack },
      ]);
    } catch (error) {
      showAlert(
        'Profile update',
        error instanceof Error ? error.message : 'Unable to update profile',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scrollable
      keyboardAvoiding={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      style={{ paddingBottom: 0 }}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold">
          Personal Information
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <AppText
          variant="body"
          color={Colors.textSecondary}
          style={styles.loading}
        >
          Loading profile…
        </AppText>
      ) : (
        <>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <AppText
                variant="caption"
                weight="semiBold"
                color={Colors.textTertiary}
                style={styles.inputLabel}
              >
                FULL NAME *
              </AppText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText
                variant="caption"
                weight="semiBold"
                color={Colors.textTertiary}
                style={styles.inputLabel}
              >
                EMAIL ADDRESS
              </AppText>
              <View style={styles.emailDisplay}>
                <AppText variant="body" color={Colors.border}>
                  {email || '—'}
                </AppText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <AppText
                variant="caption"
                weight="semiBold"
                color={Colors.textTertiary}
                style={styles.inputLabel}
              >
                PHONE NUMBER *
              </AppText>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <AppText
                  variant="caption"
                  weight="semiBold"
                  color={Colors.textTertiary}
                  style={styles.inputLabel}
                >
                  ADDRESS
                </AppText>
                <View style={styles.warningBadge}>
                  <TriangleAlert size={12} color={Colors.warning} />
                  <AppText
                    variant="caption"
                    weight="semiBold"
                    color={Colors.warning}
                  >
                    Not available yet
                  </AppText>
                </View>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your address"
                placeholderTextColor={Colors.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <AppText
                variant="caption"
                weight="semiBold"
                color={Colors.textTertiary}
                style={styles.inputLabel}
              >
                BIO
              </AppText>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Tell customers about yourself..."
                placeholderTextColor={Colors.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <AppText variant="caption" color={Colors.textTertiary}>
                {bio.length}/200
              </AppText>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton
              label="Save Changes"
              variant="primary"
              fullWidth
              loading={saving}
              onPress={() => void handleSave()}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  loading: {
    marginTop: Spacing['6'],
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['4'],
    gap: Spacing['4'],
    marginBottom: theme.spacing.xl,
    ...Elevation.sm,
  },
  inputGroup: {
    gap: Spacing['1'],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  inputLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['3'],
    fontSize: Typography.lg,
    minHeight: 52,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing['3'],
  },
  emailDisplay: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['3'],
    minHeight: 52,
    justifyContent: 'center',
  },
  actions: {
    paddingTop: Spacing['2'],
  },
});
