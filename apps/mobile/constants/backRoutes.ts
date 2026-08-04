import type { Href } from 'expo-router';

const BACK_ROUTES: Record<string, Href> = {
  profile: '/(worker)/profile',
  wallet: '/(worker)/wallet',
};

export function getBackRoute(from?: string): Href | '' {
  if (!from) return '';
  return BACK_ROUTES[from] ?? '';
}
