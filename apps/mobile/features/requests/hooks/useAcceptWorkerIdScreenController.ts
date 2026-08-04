import {
  fetchProviderProfile,
  selectWorker,
} from '../logic/AcceptWorkerIdScreenLogic';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';
import { Alert } from 'react-native';

export function useAcceptWorkerIdScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider, setProvider] = useState<any>({
    id,
    name: '',
    avatarUri: '',
    category: '',
    price: '',
  });
  const draft = useRequestStore();
  useEffect(() => {
    let active = true;
    if (id)
      void fetchProviderProfile(id).then((result) => {
        if (active && !result.error) setProvider(result.data);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const handleHire = async () => {
    if (!draft.requestId) {
      Alert.alert(
        'Request required',
        'Create and publish a service request before hiring a worker.',
      );
      return;
    }
    try {
      const booking = await selectWorker(draft.requestId, provider.id);
      draft.setDraft({ bookingId: booking.id });
      router.replace(`/tracking/${booking.id}`);
    } catch (error) {
      Alert.alert(
        'Worker unavailable',
        error instanceof Error ? error.message : 'Select another worker.',
      );
    }
  };
  const handleCancel = () => {
    router.back();
  };
  return { provider, handleHire, handleCancel };
}
