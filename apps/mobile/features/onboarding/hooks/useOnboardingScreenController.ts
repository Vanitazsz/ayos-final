import React, { useState, useRef } from 'react';
import { FlatList, ViewToken } from 'react-native';
import { router } from 'expo-router';
import { Wrench, CalendarDays, Shield } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
export interface OnboardingStep {
  id: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  title: string;
  description: string;
  color: string;
}

export const steps: OnboardingStep[] = [
  {
    id: '1',
    icon: Wrench,
    title: 'Find Trusted Pros',
    description:
      'Browse verified local service providers for plumbing, electrical, HVAC, and more.',
    color: Colors.cta,
  },
  {
    id: '2',
    icon: CalendarDays,
    title: 'Book in Seconds',
    description:
      'Schedule appointments that fit your calendar. Same-day and next-day availability.',
    color: Colors.success,
  },
  {
    id: '3',
    icon: Shield,
    title: 'Safe & Secure',
    description:
      'All providers are background-checked and insured. Pay securely in-app.',
    color: Colors.warning,
  },
];
export function useOnboardingScreenController() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingStep>>(null);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;
  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(auth)/register');
    }
  };
  const handleSkip = () => {
    router.replace('/(auth)/register');
  };
  const handleSignIn = () => {
    router.replace('/(auth)/login');
  };
  return {
    currentIndex,
    steps,
    flatListRef,
    onViewableItemsChanged,
    handleNext,
    handleSkip,
    handleSignIn,
  };
}
