import { useState } from 'react';
import { router } from 'expo-router';

export function useWorkerSettingsScreenController() {
  const [searchQuery, setSearchQuery] = useState('');
  return { searchQuery, setSearchQuery, router };
}
