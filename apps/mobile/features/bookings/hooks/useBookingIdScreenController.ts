import {
  fetchProviderProfile,
  selectWorker,
} from '../logic/BookingIdScreenLogic';
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function useBookingIdScreenController() {
  const draft = useRequestStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider, setProvider] = useState<any>({
    id,
    name: '',
    avatarUri: '',
    verified: false,
    category: '',
    rating: 0,
    reviewCount: 0,
    price: '',
  });
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
  const [selectedDay, setSelectedDay] = useState('2');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [address, setAddress] = useState(draft.address);
  const [notes, setNotes] = useState('');
  const handleBack = useCallback(() => router.back(), []);
  const handleContinue = useCallback(() => {
    if (!draft.requestId) {
      Alert.alert(
        'Service request required',
        'Confirm the service location and request details first.',
        [
          {
            text: 'Continue',
            onPress: () => router.push('/new-request/create'),
          },
        ],
      );
      return;
    }
    if (!id) return;
    void selectWorker(draft.requestId, id)
      .then((booking) => {
        draft.setDraft({ bookingId: booking.id });
        router.push(`/tracking/${booking.id}`);
      })
      .catch((error) => Alert.alert('Worker unavailable', error.message));
  }, [draft, id]);
  return {
    id,
    provider,
    selectedDay,
    setSelectedDay,
    selectedSlot,
    setSelectedSlot,
    address,
    setAddress,
    notes,
    setNotes,
    handleBack,
    handleContinue,
  };
}
