import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import type { IndustryWithSkills } from '@/services/api';
import { industryVisual } from './serviceIndustries';

interface ServiceCategoryGridProps {
  industries: IndustryWithSkills[];
  onSelect: (industry: IndustryWithSkills) => void;
  flushBottom?: boolean;
}

export const ServiceCategoryGrid = React.memo(
  function ServiceCategoryGrid({
    industries,
    onSelect,
    flushBottom = false,
  }: ServiceCategoryGridProps) {
    return (
      <View style={[styles.grid, flushBottom && styles.gridFlush]}>
        {industries.map((industry, index) => {
          const visual = industryVisual(industry.slug);
          const Icon = visual.icon;
          return (
            <Animated.View
              key={industry.id}
              entering={FadeInDown.delay(index * 50).duration(400).springify()}
              style={styles.itemWrap}
            >
              <TouchableOpacity
                style={[styles.item, flushBottom && styles.itemFlush]}
                onPress={() => onSelect(industry)}
              >
                <View
                  style={[styles.iconContainer, { backgroundColor: visual.bg }]}
                >
                  <Icon color={visual.color} size={28} />
                </View>
                <Text
                  style={[
                    theme.typography.caption,
                    styles.name,
                  ]}
                  numberOfLines={2}
                >
                  {industry.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridFlush: {
    rowGap: theme.spacing.lg,
  },
  itemWrap: { width: '25%' },
  item: { alignItems: 'center', marginBottom: theme.spacing.lg },
  itemFlush: { marginBottom: 0 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  name: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
  },
});
