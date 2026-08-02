import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore, type RequestUrgency } from '@/store/useRequestStore';

export function useNewRequestUrgencyScreenController() {
  const router = useRouter();
  const request = useRequestStore();
  const updateRequest = request.setDraft;
  const [selected, setSelected] = useState<RequestUrgency | null>(
    request.urgency,
  );
  const handleNext = () => {
    if (!selected) return;
    updateRequest({ urgency: selected });
    if (selected === 'ASAP') {
      router.push('/new-request/asap');
    } else {
      router.push('/new-request/this-week');
    }
  };
  return { router, selected, setSelected, handleNext };
}
