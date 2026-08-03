import { styles } from './WorkerServiceSetupScreen.styles';
import { Pressable, Switch, View } from 'react-native';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppSelect } from '@/components/AppSelect';
import { AppText } from '@/components/AppText';
import { LocationPicker } from '@/components/LocationPicker';
import { Screen } from '@/components/layout/Screen';
import { Colors } from '@/constants/theme';
import type { useWorkerServiceSetupScreenController } from '../hooks/useWorkerServiceSetupScreenController';
const RADIUS_OPTIONS = [
  { label: '2 km', value: '2000' },
  { label: '5 km', value: '5000' },
  { label: '10 km', value: '10000' },
  { label: '20 km', value: '20000' },
  { label: '50 km', value: '50000' },
];
export function WorkerServiceSetupView({
  model,
}: {
  model: ReturnType<typeof useWorkerServiceSetupScreenController>;
}) {
  const {
    router,
    locationPickerRef,
    readiness,
    coords,
    setCoords,
    serviceArea,
    setServiceArea,
    radius,
    setRadius,
    online,
    setOnline,
    loading,
    saving,
    error,
    warning,
    setWarning,
    saved,
    setSaved,
    save,
    canGoOnline,
  } = model;
  return (
    <Screen safeArea scrollable>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <AppText variant="h3" weight="bold">
          Service Availability
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <AppText variant="body" color={Colors.textSecondary}>
            Loading worker setup…
          </AppText>
        ) : (
          <>
            {readiness ? (
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
            ) : null}

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

            <View style={styles.card}>
              <View style={styles.onlineRow}>
                <View style={styles.onlineCopy}>
                  <AppText variant="body" weight="bold">
                    Available for matching
                  </AppText>
                  <AppText variant="caption" color={Colors.textSecondary}>
                    {canGoOnline
                      ? 'Turn this on when you are ready to receive requests.'
                      : 'Admin approval, at least one skill, and a service rate are required.'}
                  </AppText>
                </View>
                <Switch
                  accessibilityLabel="Available for matching"
                  value={online}
                  disabled={!canGoOnline}
                  onValueChange={(value) => {
                    setOnline(value);
                    setSaved(false);
                  }}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </View>
              {readiness?.matchable ? (
                <AppText variant="caption" color={Colors.verified}>
                  Your profile is eligible for matching.
                </AppText>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <AppText variant="bodySm" color={Colors.error}>
                  {error}
                </AppText>
              </View>
            ) : null}
            {saved ? (
              <AppText variant="bodySm" color={Colors.verified}>
                Service availability saved.
              </AppText>
            ) : null}
            <AppButton
              label="Save Service Availability"
              loading={saving}
              fullWidth
              onPress={() => void save()}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
