import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Pressable, FlatList, ViewToken } from 'react-native';
import { router } from 'expo-router';
import { Wrench, CalendarDays, Shield } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    id: '1',
    icon: Wrench,
    title: 'Find Trusted Pros',
    description: 'Browse verified local service providers for plumbing, electrical, HVAC, and more.',
    color: Colors.cta,
  },
  {
    id: '2',
    icon: CalendarDays,
    title: 'Book in Seconds',
    description: 'Schedule appointments that fit your calendar. Same-day and next-day availability.',
    color: Colors.success,
  },
  {
    id: '3',
    icon: Shield,
    title: 'Safe & Secure',
    description: 'All providers are background-checked and insured. Pay securely in-app.',
    color: Colors.warning,
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingStep>>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

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

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <AppText variant="body" weight="semiBold" color={Colors.textSecondary}>
            Skip
          </AppText>
        </Pressable>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={steps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.stepContainer, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
              <item.icon size={64} color={item.color} strokeWidth={1.5} />
            </View>
            <AppText variant="h2" weight="bold" align="center" style={styles.stepTitle}>
              {item.title}
            </AppText>
            <AppText variant="body" color={Colors.textSecondary} align="center" style={styles.stepDesc}>
              {item.description}
            </AppText>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {steps.map((_, idx) => (
          <View
            key={idx}
            style={[styles.dot, idx === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.bottomSection}>
        <AppButton
          label={currentIndex === steps.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          fullWidth
          style={styles.primaryBtn}
          labelStyle={{ color: Colors.white }}
        />
        <Pressable onPress={handleSignIn} style={styles.signInLink}>
          <AppText variant="bodySm" color={Colors.textSecondary}>
            Already have an account?{' '}
          </AppText>
          <AppText variant="bodySm" weight="bold" color={Colors.cta}>
            Sign In
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing['4'],
    paddingTop: 60,
    paddingBottom: Spacing['2'],
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['8'],
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['8'],
  },
  stepTitle: {
    marginBottom: Spacing['3'],
  },
  stepDesc: {
    lineHeight: Typography.lg * Typography.lineHeightRelaxed,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['6'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.cta,
  },
  bottomSection: {
    paddingHorizontal: Spacing['4'],
    paddingBottom: Spacing['10'],
  },
  primaryBtn: {
    backgroundColor: Colors.cta,
    marginBottom: Spacing['4'],
  },
  signInLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
