import { styles } from './OnboardingScreen.styles';
import React from 'react';
import { View, Dimensions, Pressable, FlatList } from 'react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import {
  steps,
  type OnboardingStep,
} from '../hooks/useOnboardingScreenController';
import type { useOnboardingScreenController } from '../hooks/useOnboardingScreenController';
const { width } = Dimensions.get('window');

export function OnboardingView({
  model,
}: {
  model: ReturnType<typeof useOnboardingScreenController>;
}) {
  const {
    currentIndex,
    flatListRef,
    onViewableItemsChanged,
    handleNext,
    handleSkip,
    handleSignIn,
  } = model;
  return (
    <View style={styles.container}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <AppText
            variant="body"
            weight="semiBold"
            color={Colors.textSecondary}
          >
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
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: item.color + '15' },
              ]}
            >
              <item.icon size={64} color={item.color} strokeWidth={1.5} />
            </View>
            <AppText
              variant="h2"
              weight="bold"
              align="center"
              style={styles.stepTitle}
            >
              {item.title}
            </AppText>
            <AppText
              variant="body"
              color={Colors.textSecondary}
              align="center"
              style={styles.stepDesc}
            >
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
