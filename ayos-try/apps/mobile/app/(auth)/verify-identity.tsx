import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { ShieldCheck } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { AppSelect, type SelectOption } from '@/components/AppSelect';
import { ImageUploadCard } from '@/components/ImageUploadCard';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { submitCustomerVerification } from '@/services/customerVerification';
import { detectSubdivision, setMySubdivision } from '@/services/subdivisions';

const ID_TYPES: SelectOption[] = [
  { label: 'PhilSys ID', value: 'philsys' },
  { label: "Driver's License", value: 'drivers_license' },
  { label: 'Passport', value: 'passport' },
  { label: 'UMID', value: 'umid' },
  { label: 'Postal ID', value: 'postal_id' },
];

export default function VerifyIdentityScreen() {
  const [idType, setIdType] = useState('');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [subdivisionName, setSubdivisionName] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detect = async (quiet = false) => {
    setDetecting(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (!quiet)
          Alert.alert(
            'Location permission',
            'Choose your subdivision later from your profile.',
          );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const subdivision = await detectSubdivision(
        position.coords.latitude,
        position.coords.longitude,
      );
      if (subdivision) {
        await setMySubdivision(subdivision.id);
        setSubdivisionName(subdivision.name);
      } else if (!quiet) {
        Alert.alert(
          'Outside service area',
          'Your location is not inside an active A-YOS subdivision.',
        );
      }
    } catch (error) {
      if (!quiet)
        Alert.alert(
          'Subdivision detection',
          error instanceof Error
            ? error.message
            : 'Unable to detect subdivision',
        );
    } finally {
      setDetecting(false);
    }
  };
  useEffect(() => {
    void detect(true);
  }, []);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!idType) next.idType = 'Select an ID type';
    if (!frontUri) next.front = 'Capture or upload the front of your ID';
    if (!backUri) next.back = 'Capture or upload the back of your ID';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await submitCustomerVerification({
        idType,
        frontUri: frontUri!,
        backUri: backUri!,
      });
      Alert.alert(
        'Verification submitted',
        'You can book services after an administrator approves your ID.',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)/home') }],
      );
    } catch (error) {
      Alert.alert(
        'Verification failed',
        error instanceof Error
          ? error.message
          : 'Unable to submit verification',
      );
    } finally {
      setSubmitting(false);
    }
  };

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

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: Spacing['6'] },
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['4'],
  },
  subtitle: { marginTop: Spacing['2'], maxWidth: 420 },
  areaCard: {
    backgroundColor: Colors.verifiedBg,
    borderRadius: Radius.lg,
    padding: Spacing['3'],
    marginBottom: Spacing['4'],
    alignItems: 'center',
  },
  upload: { marginTop: Spacing['5'] },
  action: { marginTop: Spacing['5'] },
  note: { marginTop: Spacing['3'], marginBottom: Spacing['8'] },
});
