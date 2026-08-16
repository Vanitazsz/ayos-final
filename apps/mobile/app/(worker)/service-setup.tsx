import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import {
  LocationPicker,
  type LocationCoordinates,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
import { Screen } from '@/components/layout/Screen';
import { Colors, Radius, Spacing, theme } from '@/constants/theme';
import {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
} from '@/services/workerMatching';
import { getBackRoute } from '@/constants/backRoutes';
import { useGoBack } from '@/hooks/useGoBack';

const RADIUS_OPTIONS = [
  { label: '2 km', value: '2000' },
  { label: '5 km', value: '5000' },
  { label: '10 km', value: '10000' },
  { label: '20 km', value: '20000' },
  { label: '50 km', value: '50000' },
];

export default function WorkerServiceSetupScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = useGoBack('/(worker)/profile');
  const handleBack = () => {
    const route = getBackRoute(from);
    if (route) router.push(route);
    else goBack();
  };
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const [readiness, setReadiness] = useState<WorkerMatchingReadiness | null>(
    null,
  );
  const [coords, setCoords] = useState<LocationCoordinates | null>(null);
  const [serviceArea, setServiceArea] = useState('');
  const [radius, setRadius] = useState('10000');
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      void getWorkerMatchingReadiness()
        .then((result) => {
          if (!active) return;
          setReadiness(result);
          if (result.latitude != null && result.longitude != null) {
            setCoords({
              latitude: Number(result.latitude),
              longitude: Number(result.longitude),
            });
          }
          setServiceArea(result.serviceArea ?? '');
          setRadius(String(result.radiusMeters ?? 10000));
          setOnline(result.online);
        })
        .catch((reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : 'Unable to load matching setup.',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const save = async () => {
    setError('');
    setSaved(false);
    if (!coords) {
      setError('Use your current location to confirm your service origin.');
      return;
    }
    if (serviceArea.trim().length < 2) {
      setError('Enter a service-area name or address.');
      return;
    }
    setSaving(true);
    try {
      const result = await saveWorkerMatchingSetup({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusMeters: Number(radius),
        serviceArea,
        online,
      });
      setReadiness(result);
      setOnline(result.online);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to save matching setup.',
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
          Service Areas
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.section}>
          <AppText variant="body" color={Colors.textSecondary}>
            Loading worker setup…
          </AppText>
        </View>
      ) : (
        <>
          {readiness ? (
            <View style={styles.section}>
              <View style={styles.card}>
                <AppText variant="body" weight="bold">
                  Matching readiness
                </AppText>
                {[
                  {
                    label: 'Admin verification approved',
                    ready: readiness.verificationStatus === 'APPROVED',
                  },
                  {
                    label: 'Industry & skills',
                    ready: readiness.skillsReady,
                  },
                  {
                    label: 'Service rate set in Industry & Skills',
                    ready: readiness.rateReady,
                  },
                  {
                    label: 'Service origin and radius',
                    ready: readiness.serviceAreaReady,
                  },
                  { label: 'Available online', ready: readiness.online },
                ].map((item) => (
                  <View key={item.label} style={styles.readinessRow}>
                    <View
                      style={[
                        styles.readinessDot,
                        item.ready && styles.readinessDotReady,
                      ]}
                    />
                    <AppText
                      variant="bodySm"
                      color={
                        item.ready ? Colors.verified : Colors.textSecondary
                      }
                    >
                      {item.label}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardTitle}>
                <MapPin size={18} color={Colors.primary} />
                <AppText variant="body" weight="bold">
                  Service origin
                </AppText>
              </View>
              <AppText variant="caption" color={Colors.textSecondary}>
                Customers only see your approximate distance. Your confirmed
                point is used to check the coverage radius.
              </AppText>
              <LocationPicker
                ref={locationPickerRef}
                coords={coords}
                buttonVariant="outline"
                placeholderWhenEmpty
                onCoordinatesDetected={(next) => {
                  setCoords(next);
                  setSaved(false);
                }}
                onLocationDetected={(details, next, label) => {
                  setCoords(next);
                  setServiceArea(
                    label ||
                      [details.district, details.city, details.region]
                        .filter(Boolean)
                        .join(', '),
                  );
                  setWarning('');
                  setSaved(false);
                }}
                onWarning={(message) => setWarning(message ?? '')}
              />
              {warning ? (
                <AppText variant="caption" color={Colors.warning}>
                  {warning}
                </AppText>
              ) : null}
              <AppInput
                label="Service area label"
                placeholder="Trece Martires City, Cavite"
                value={serviceArea}
                onChangeText={(value) => {
                  setServiceArea(value);
                  setSaved(false);
                }}
              />
              <AppSelect
                label="Coverage radius"
                options={RADIUS_OPTIONS}
                value={radius}
                onSelect={(value) => {
                  setRadius(value);
                  setSaved(false);
                }}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.section}>
              <View style={styles.errorCard}>
                <AppText variant="bodySm" color={Colors.error}>
                  {error}
                </AppText>
              </View>
            </View>
          ) : null}
          {saved ? (
            <View style={styles.section}>
              <AppText variant="bodySm" color={Colors.verified}>
                Service availability saved.
              </AppText>
            </View>
          ) : null}
          <View style={styles.section}>
            <AppButton
              label="Save Service Availability"
              loading={saving}
              fullWidth
              onPress={() => void save()}
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
  section: {
    marginBottom: Spacing['4'],
  },
  card: {
    gap: Spacing['3'],
    padding: Spacing['4'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  readinessDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  readinessDotReady: { backgroundColor: Colors.verified },
  errorCard: {
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorBg,
  },
});
