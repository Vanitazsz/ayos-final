import {
  getWorkerMatchingReadiness,
  saveWorkerMatchingSetup,
  type WorkerMatchingReadiness,
  canGoOnline as computeCanGoOnline,
  validateServiceArea,
} from '../logic/WorkerServiceSetupScreenLogic';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  type LocationCoordinates,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
export function useWorkerServiceSetupScreenController() {
  const router = useRouter();
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
    const areaError = validateServiceArea(serviceArea);
    if (areaError) {
      setError(areaError.serviceArea);
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
  const canGoOnline = computeCanGoOnline(
    readiness?.verificationStatus,
    readiness?.skillsReady ?? false,
    readiness?.rateReady ?? false,
  );
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
