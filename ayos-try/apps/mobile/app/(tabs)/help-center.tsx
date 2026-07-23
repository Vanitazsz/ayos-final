import React from 'react';
import { Redirect } from 'expo-router';
import { PublishedContentPage } from '@/components/content/PublishedContentPage';
import { useAuthStore } from '@/store/useAuthStore';

export default function HelpCenterScreen() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== 'USER') return <Redirect href="/(worker)" />;

  return (
    <PublishedContentPage
      contentKey="HELP_CENTER"
      fallbackTitle="Help Center"
    />
  );
}
