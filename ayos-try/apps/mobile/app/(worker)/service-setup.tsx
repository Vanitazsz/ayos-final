import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, MapPin } from 'lucide-react-native';
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
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
  type WorkerScheduleDay,
} from '@/services/workerMatching';

const DAYS = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 0, label: 'Sunday' },
] as const;

const RADIUS_OPTIONS = [
  { label: '2 km', value: '2000' },
  { label: '5 km', value: '5000' },
  { label: '10 km', value: '10000' },
  { label: '20 km', value: '20000' },
  { label: '50 km', value: '50000' },
];

type ScheduleState = Record<
  number,
  { enabled: boolean; startTime: string; endTime: string }
>;

const DEFAULT_SCHEDULE: ScheduleState = Object.fromEntries(
  DAYS.map(({ dayOfWeek }) => [
    dayOfWeek,
    {
      enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
      startTime: '08:00',
      endTime: '17:00',
    },
  ]),
);

function scheduleFromRows(rows: WorkerScheduleDay[]): ScheduleState {
  const next = Object.fromEntries(
    Object.entries(DEFAULT_SCHEDULE).map(([day, value]) => [
      Number(day),
      { ...value },
    ]),
  ) as ScheduleState;
  for (const row of rows) {
    next[row.dayOfWeek] = {
      enabled: true,
      startTime: row.startTime,
      endTime: row.endTime,
    };
  }
  return next;
}

export default function WorkerServiceSetupScreen() {
  const router = useRouter();
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const [readiness, setReadiness] =
    useState<WorkerMatchingReadiness | null>(null);
  const [coords, setCoords] = useState<LocationCoordinates | null>(null);
  const [serviceArea, setServiceArea] = useState('');
  const [radius, setRadius] = useState('10000');
  const [schedule, setSchedule] = useState<ScheduleState>(DEFAULT_SCHEDULE);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
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
        setSchedule(scheduleFromRows(result.schedule ?? []));
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
  }, []);

  const selectedSchedule = useMemo(
    () =>
      DAYS.filter(({ dayOfWeek }) => schedule[dayOfWeek].enabled).map(
        ({ dayOfWeek }) => ({
          dayOfWeek,
          startTime: schedule[dayOfWeek].startTime,
          endTime: schedule[dayOfWeek].endTime,
          timezone: 'Asia/Manila',
        }),
      ),
    [schedule],
  );

  const toggleDay = (dayOfWeek: number) => {
    setSchedule((current) => ({
      ...current,
      [dayOfWeek]: {
        ...current[dayOfWeek],
        enabled: !current[dayOfWeek].enabled,
      },
    }));
    setSaved(false);
  };

  const updateTime = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    setSchedule((current) => ({
      ...current,
      [dayOfWeek]: { ...current[dayOfWeek], [field]: value },
    }));
    setSaved(false);
  };

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
    if (!selectedSchedule.length) {
      setError('Select at least one working day.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveWorkerMatchingSetup({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusMeters: Number(radius),
        serviceArea,
        schedule: selectedSchedule,
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

  const canGoOnline =
    readiness?.verificationStatus === 'APPROVED' &&
    Boolean(readiness?.skillsReady);

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
                  { label: 'At least one active skill', ready: readiness.skillsReady },
                  { label: 'Service origin and radius', ready: readiness.serviceAreaReady },
                  { label: 'Working schedule', ready: readiness.scheduleReady },
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
              <AppText variant="body" weight="bold">
                Weekly schedule
              </AppText>
              <AppText variant="caption" color={Colors.textSecondary}>
                Times use Philippine Standard Time.
              </AppText>
              {DAYS.map(({ dayOfWeek, label }) => {
                const value = schedule[dayOfWeek];
                return (
                  <View key={dayOfWeek} style={styles.dayRow}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: value.enabled }}
                      accessibilityLabel={label}
                      onPress={() => toggleDay(dayOfWeek)}
                      style={styles.dayToggle}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          value.enabled && styles.checkboxSelected,
                        ]}
                      >
                        {value.enabled ? (
                          <CheckCircle2 size={14} color={Colors.white} />
                        ) : null}
                      </View>
                      <AppText variant="bodySm" weight="medium">
                        {label}
                      </AppText>
                    </Pressable>
                    {value.enabled ? (
                      <View style={styles.timeInputs}>
                        <AppInput
                          placeholder="08:00"
                          value={value.startTime}
                          maxLength={5}
                          onChangeText={(text) =>
                            updateTime(dayOfWeek, 'startTime', text)
                          }
                          containerStyle={styles.timeInput}
                        />
                        <AppText variant="caption" color={Colors.textSecondary}>
                          to
                        </AppText>
                        <AppInput
                          placeholder="17:00"
                          value={value.endTime}
                          maxLength={5}
                          onChangeText={(text) =>
                            updateTime(dayOfWeek, 'endTime', text)
                          }
                          containerStyle={styles.timeInput}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
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
                      : 'Admin approval and at least one skill are required.'}
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
  content: { gap: Spacing['4'], paddingBottom: Spacing['8'] },
  card: {
    gap: Spacing['3'],
    padding: Spacing['4'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
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
  dayRow: {
    gap: Spacing['2'],
    paddingVertical: Spacing['2'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dayToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  timeInput: { flex: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  onlineCopy: { flex: 1, gap: Spacing['1'] },
  errorCard: {
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorBg,
  },
});
