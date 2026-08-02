import {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
  type WorkerScheduleDay,
} from '../logic/WorkerServiceSetupScreenLogic';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  type LocationCoordinates,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
const DAYS = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 0, label: 'Sunday' },
] as const;

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
export function useWorkerServiceSetupScreenController() {
  const router = useRouter();
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const [readiness, setReadiness] = useState<WorkerMatchingReadiness | null>(
    null,
  );
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
    }, []),
  );
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
    readiness.skillsReady &&
    readiness.rateReady;
  return {
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
  };
}
