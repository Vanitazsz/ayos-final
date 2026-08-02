import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
    // Resolve the selected weekday into the next calendar occurrence.
    const scheduledDate = new Date();
    const targetDay = (DAYS.indexOf(selectedDay || 'Mon') + 1) % 7;
    const daysAhead = (targetDay - scheduledDate.getDay() + 7) % 7 || 7;
    scheduledDate.setDate(scheduledDate.getDate() + daysAhead);
    if (selectedTime?.includes('8am')) scheduledDate.setHours(9, 0, 0);
    else if (selectedTime?.includes('12pm')) scheduledDate.setHours(14, 0, 0);
    else scheduledDate.setHours(18, 0, 0);

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
