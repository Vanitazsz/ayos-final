import {
  requestCurrentCoordinates,
  reverseGeocode,
} from '../logic/NewRequestAsapScreenLogic';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function useNewRequestAsapScreenController() {
  const router = useRouter();
  const request = useRequestStore();
  const updateRequest = request.setDraft;
  const draft = request;
  useEffect(() => {
    if (!request.location) {
      void (async () => {
        const position = await requestCurrentCoordinates('high');
        const details = await reverseGeocode(
          position.latitude,
          position.longitude,
        );
        const value = {
          latitude: position.latitude,
          longitude: position.longitude,
          address: details.displayLabel,
        };
        updateRequest({ location: value });
        draft.setDraft({
          coords: { latitude: value.latitude, longitude: value.longitude },
          address: value.address,
          addressDetails: details,
        });
      })();
    }
  }, []);
  const handleBack = () => router.back();
  const handlePostRequest = () => {
    updateRequest({ status: 'Posted' });
    draft.setDraft({
      scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    router.push('/new-request/matching' as any);
  };
  const isASAP = request.urgency === 'ASAP';
  const getPrimaryButtonText = () => {
    if (isASAP) return 'Start Live Matching';
    return 'Start Live Matching';
  };
  return {
    router,
    request,
    handleBack,
    handlePostRequest,
    getPrimaryButtonText,
  };
}
