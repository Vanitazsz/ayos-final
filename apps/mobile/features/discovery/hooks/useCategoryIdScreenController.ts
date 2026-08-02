import { fetchProviders } from '../logic/CategoryIdScreenLogic';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import type { ProviderData } from '@/components/ProviderCard';

export function useCategoryIdScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const categoryName =
    typeof id === 'string' ? decodeURIComponent(id).toLowerCase() : '';
  const [providers, setProviders] = useState<ProviderData[]>([]);
  useEffect(() => {
    void fetchProviders().then((result) => setProviders(result.data));
  }, []);
  const workers = useMemo(
    () =>
      providers.filter((worker) =>
        worker.category.toLowerCase().includes(categoryName),
      ),
    [categoryName, providers],
  );
  const title = categoryName
    ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
    : 'Workers';
  return { router, id, workers, title, Image };
}
