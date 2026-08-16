import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import type { IndustrySkill, IndustryWithSkills } from '@/services/api';
import { industryVisualByName } from './serviceIndustries';

interface ServiceCategorySheetProps {
  visible: boolean;
  industry: IndustryWithSkills | null;
  items: IndustrySkill[];
  onSelect: (skill: IndustrySkill) => void;
  onClose: () => void;
  insetBottom?: number;
}

export const ServiceCategorySheet = React.memo(
  function ServiceCategorySheet({
    visible,
    industry,
    items,
    onSelect,
    onClose,
    insetBottom = 20,
  }: ServiceCategorySheetProps) {
    const visual = industryVisualByName(industry?.name);
    const Icon = visual.icon;
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View
            entering={SlideInDown}
            style={[styles.sheet, { paddingBottom: insetBottom + 20 }]}
          >
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                {Icon ? (
                  <View style={[styles.titleIcon, { backgroundColor: visual.bg }]}>
                    <Icon color={visual.color} size={18} />
                  </View>
                ) : null}
                <Text style={theme.typography.h3}>{industry?.name} Services</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <X color={theme.colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {items.length > 0 ? (
                items.map((skill) => {
                  const rowVisual = industryVisualByName(skill.name);
                  const RowIcon = rowVisual.icon;
                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={styles.subcatItem}
                      onPress={() => onSelect(skill)}
                    >
                      <View style={styles.subcatLeft}>
                        <View
                          style={[
                            styles.subcatIcon,
                            { backgroundColor: rowVisual.bg },
                          ]}
                        >
                          <RowIcon color={rowVisual.color} size={20} />
                        </View>
                        <Text style={theme.typography.body1}>{skill.name}</Text>
                      </View>
                      <ChevronRight
                        color={theme.colors.textTertiary}
                        size={20}
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.empty}>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    No services available in this category yet.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subcatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  subcatLeft: { flexDirection: 'row', alignItems: 'center' },
  subcatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
});
