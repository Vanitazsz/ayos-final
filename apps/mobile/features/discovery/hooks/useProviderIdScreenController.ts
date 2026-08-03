import { fetchProviderProfile } from '../logic/ProviderIdScreenLogic';
import React, { useCallback, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export function useProviderIdScreenController() {
  const { id, isApplicant } = useLocalSearchParams<{
    id: string;
    isApplicant?: string;
  }>();
  const [provider, setProvider] = React.useState<any>({
    id,
    name: '',
    avatarUri: '',
    category: '',
    verified: false,
    rating: 0,
    reviewCount: 0,
    distance: '',
    eta: '',
    price: '',
    bio: '',
    services: [],
    reviews: [],
  });
  const [isFav, setIsFav] = React.useState(false);
  useEffect(() => {
    if (id)
      void fetchProviderProfile(id).then((result) => {
        if (!result.error) setProvider(result.data);
      });
  }, [id]);
  const handleBack = useCallback(() => router.back(), []);
  const handleBook = useCallback(
    () => router.push(`/booking/${provider.id}`),
    [provider.id],
  );
  return {
    id,
    isApplicant,
    provider,
    isFav,
    setIsFav,
    handleBack,
    handleBook,
    router,
  };
}
