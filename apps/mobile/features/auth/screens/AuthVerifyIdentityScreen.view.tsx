import { styles } from './AuthVerifyIdentityScreen.styles';
import { View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppSelect, type SelectOption } from '@/components/AppSelect';
import { ImageUploadCard } from '@/components/ImageUploadCard';
import { Colors } from '@/constants/theme';
import type { useAuthVerifyIdentityScreenController } from '../hooks/useAuthVerifyIdentityScreenController';
const ID_TYPES: SelectOption[] = [
  { label: 'PhilSys ID', value: 'philsys' },
  { label: "Driver's License", value: 'drivers_license' },
  { label: 'Passport', value: 'passport' },
  { label: 'UMID', value: 'umid' },
  { label: 'Postal ID', value: 'postal_id' },
];
export function VerifyIdentityView({
  model,
}: {
  model: ReturnType<typeof useAuthVerifyIdentityScreenController>;
}) {
  const {
    idType,
    setIdType,
    setFrontUri,
    setBackUri,
    subdivisionName,
    detecting,
    submitting,
    submitStatus,
    submitError,
    errors,
    setErrors,
    detect,
    submit,
    router,
  } = model;
  return (
    <Screen safeArea scrollable>
      <View style={styles.header}>
        <View style={styles.icon}>
          <ShieldCheck size={30} color={Colors.primary} />
        </View>
        <AppText variant="h2" weight="bold" align="center">
          Verify your identity
        </AppText>
        <AppText
          variant="bodySm"
          color={Colors.textSecondary}
          align="center"
          style={styles.subtitle}
        >
          Upload a Philippine government-issued ID. Verification is required
          before creating a booking.
        </AppText>
      </View>
      {subdivisionName ? (
        <View style={styles.areaCard}>
          <AppText variant="bodySm" color={Colors.verified}>
            Service area: {subdivisionName}
          </AppText>
        </View>
      ) : null}
      <AppSelect
        label="ID Type"
        options={ID_TYPES}
        value={idType}
        onSelect={(value) => {
          setIdType(value);
          setErrors((current) => ({ ...current, idType: '' }));
        }}
        error={errors.idType}
      />
      <ImageUploadCard
        label="Front of ID"
        description="Take a clear photo with all corners visible"
        onImageSelected={(value) => {
          setFrontUri(value);
          setErrors((current) => ({ ...current, front: '' }));
        }}
        error={errors.front}
        containerStyle={styles.upload}
      />
      <ImageUploadCard
        label="Back of ID"
        description="Take a clear photo with all corners visible"
        onImageSelected={(value) => {
          setBackUri(value);
          setErrors((current) => ({ ...current, back: '' }));
        }}
        error={errors.back}
        containerStyle={styles.upload}
      />
      {submitStatus ? (
        <View style={[styles.feedback, styles.progressFeedback]}>
          <AppText variant="bodySm" color={Colors.primary}>
            {submitStatus}
          </AppText>
        </View>
      ) : null}
      {submitError ? (
        <View style={[styles.feedback, styles.errorFeedback]}>
          <AppText variant="bodySm" color={Colors.error}>
            {submitError}
          </AppText>
        </View>
      ) : null}
      {!subdivisionName ? (
        <AppButton
          label={detecting ? 'Detecting…' : 'Detect my subdivision'}
          variant="outline"
          loading={detecting}
          onPress={() => void detect()}
          fullWidth
          style={styles.action}
        />
      ) : null}
      <AppButton
        label="Submit for verification"
        loading={submitting}
        onPress={() => void submit()}
        fullWidth
        style={styles.action}
      />
      <AppButton
        label="Skip for now"
        variant="ghost"
        disabled={submitting}
        onPress={() => router.replace('/(tabs)/home')}
        fullWidth
      />
      <AppText
        variant="caption"
        color={Colors.textTertiary}
        align="center"
        style={styles.note}
      >
        Skipping enables view-only access. You cannot create bookings until your
        identity is verified.
      </AppText>
    </Screen>
  );
}
