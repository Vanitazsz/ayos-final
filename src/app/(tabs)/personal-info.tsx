import React, { useEffect, useState } from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/layout/Screen';
import { ToneCard } from '@/components/ToneCard';
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
} from '@/services/profile';
import { loadCurrentUser } from '@/services/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { showAlert } from '@/components/AppAlert';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSessionUser = useAuthStore((state) => state.setSessionUser);
  const handleBack = () => {
    router.replace('/(tabs)/profile');
  };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getMyProfile();
        if (!active) return;
        setName(profile.displayName);
        setEmail(profile.email);
        setPhone(profile.mobile ?? '');
        setBio(profile.bio ?? '');
        setProfileComplete(profile.profileComplete);
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
      const updated = await updateMyProfile({
        displayName: name,
        mobile: normalizedMobile || null,
        location: null,
        bio: bio || null,
        complete: true,
      });
      setProfileComplete(updated.profileComplete);
      void queryClient.invalidateQueries({
        queryKey: ['customer', 'profile'],
      });
      try {
        const authUser = await loadCurrentUser();
        if (authUser) setSessionUser(authUser);
      } catch {
        // The profile was saved; the auth store refreshes on the next
        // session event if this optional refresh fails.
      }
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
          {!profileComplete && (
            <ToneCard
              tone="info"
              icon={<Info size={16} color={Colors.info} />}
              title="Important Instruction for New Accounts"
              style={styles.instructionCard}
            >
              <AppText variant="caption" color={Colors.textSecondary}>
                Welcome! Please enter your Full Name and Mobile Number below,
                then tap the highlighted{' '}
                <AppText
                  variant="caption"
                  weight="bold"
                  color={Colors.primary}
                >
                  SAVE CHANGES
                </AppText>{' '}
                button first before navigating to other pages.
              </AppText>
            </ToneCard>
          )}

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
              {profileComplete ? (
                <View style={styles.emailDisplay}>
                  <AppText variant="body" color={Colors.border}>
                    {phone || '—'}
                  </AppText>
                </View>
              ) : (
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 09171234567 or +639171234567"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              )}
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
                placeholder="Tell service providers about yourself..."
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
  instructionCard: {
    marginHorizontal: theme.layout.screenPadding,
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    gap: Spacing['1'],
  },
  inputLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    marginHorizontal: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xl,
  },
});
