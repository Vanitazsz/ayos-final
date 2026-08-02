import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useRequestStore } from '@/store/useRequestStore';

export function useNewRequestRadiusConfigScreenController() {
  const router = useRouter();
  const draft = useRequestStore();
  const [radius, setRadius] = useState(draft.searchRadiusKm);
  const handleDecrease = () => {
    if (radius > 1) setRadius(radius - 1);
  };
  const handleIncrease = () => {
    if (radius < 50) setRadius(radius + 1);
  };
  const handleSave = () => {
    draft.setDraft({ searchRadiusKm: radius });
    router.back();
  };
  return {
    router,
    draft,
    radius,
    setRadius,
    handleDecrease,
    handleIncrease,
    handleSave,
  };
}
