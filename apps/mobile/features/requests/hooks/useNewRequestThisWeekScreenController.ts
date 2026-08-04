import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';
import { resolveWeekday } from '../logic/NewRequestThisWeekScreenLogic';
export function useNewRequestThisWeekScreenController() {
  const router = useRouter();
  const request = useRequestStore();
  const updateRequest = request.setDraft;
  const setDraft = useRequestStore((state) => state.setDraft);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const handleBack = () => router.back();
  const handleEditRequest = () => {
    router.push('/new-request/create' as any);
  };
  const handleConfirm = () => {
    const scheduledDate = resolveWeekday(selectedDay || 'Mon', selectedTime);

    updateRequest({
      scheduledDate,
      status: 'Posted',
    });
    setDraft({ scheduledAt: scheduledDate.toISOString() });
    router.push('/new-request/matching' as any);
  };
  const isFormValid = selectedDay && selectedTime;
  return {
    request,
    selectedDay,
    setSelectedDay,
    selectedTime,
    setSelectedTime,
    handleBack,
    handleEditRequest,
    handleConfirm,
    isFormValid,
  };
}
