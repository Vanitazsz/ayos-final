import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  LayoutAnimation,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';

interface AccordionContextValue {
  expandedKeys: string[];
  allowsMultiple: boolean;
  reducedMotion: boolean;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error('Accordion components must be used within <Accordion>');
  }
  return ctx;
}

interface ItemContextValue {
  panelId: string;
  isExpanded: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

const ItemContext = createContext<ItemContextValue | null>(null);

function useItemContext(): ItemContextValue {
  const ctx = useContext(ItemContext);
  if (!ctx) {
    throw new Error('AccordionItem components must be used within <Accordion>');
  }
  return ctx;
}

export interface AccordionProps {
  defaultExpandedKeys?: string[];
  expandedKeys?: string[];
  onExpandedChange?: (keys: string[]) => void;
  allowsMultipleExpanded?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Accordion({
  defaultExpandedKeys = [],
  expandedKeys: controlledKeys,
  onExpandedChange,
  allowsMultipleExpanded = false,
  style,
  children,
}: AccordionProps) {
  const [internalKeys, setInternalKeys] = useState<string[]>(
    defaultExpandedKeys,
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  const expandedKeys = controlledKeys ?? internalKeys;

  const toggle = useCallback(
    (id: string) => {
      const next = allowsMultipleExpanded
        ? expandedKeys.includes(id)
          ? expandedKeys.filter((key) => key !== id)
          : [...expandedKeys, id]
        : expandedKeys.includes(id)
          ? []
          : [id];
      if (!reducedMotion) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      if (onExpandedChange) {
        onExpandedChange(next);
      } else {
        setInternalKeys(next);
      }
    },
    [allowsMultipleExpanded, expandedKeys, reducedMotion, onExpandedChange],
  );

  const value = useMemo(
    () => ({
      expandedKeys,
      allowsMultiple: allowsMultipleExpanded,
      reducedMotion,
      toggle,
    }),
    [expandedKeys, allowsMultipleExpanded, reducedMotion, toggle],
  );

  return (
    <AccordionContext.Provider value={value}>
      <View style={[styles.accordion, style]}>{children}</View>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  id: string;
  isDisabled?: boolean;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AccordionItem({
  id,
  isDisabled = false,
  isLast = false,
  style,
  children,
}: AccordionItemProps) {
  const accordion = useAccordionContext();
  const panelId = useId();
  const isExpanded = accordion.expandedKeys.includes(id);
  const onToggle = useCallback(() => accordion.toggle(id), [
    accordion,
    id,
  ]);

  const value = useMemo(
    () => ({ panelId, isExpanded, isDisabled, onToggle }),
    [panelId, isExpanded, isDisabled, onToggle],
  );

  return (
    <ItemContext.Provider value={value}>
      <View style={[styles.item, isLast && styles.itemLast, style]}>
        {children}
      </View>
    </ItemContext.Provider>
  );
}

export interface AccordionTriggerProps {
  label?: string;
  children: React.ReactNode;
}

export function AccordionTrigger({ label, children }: AccordionTriggerProps) {
  const item = useItemContext();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={item.onToggle}
      disabled={item.isDisabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{
        expanded: item.isExpanded,
        disabled: item.isDisabled,
      }}
      accessibilityLabel={label}
      accessibilityHint={item.isExpanded ? 'Collapse' : 'Expand'}
      aria-controls={item.panelId}
      style={({ pressed }) => [
        styles.trigger,
        pressed && !item.isDisabled && styles.triggerPressed,
        focused && styles.triggerFocused,
        item.isDisabled && styles.triggerDisabled,
      ]}
    >
      <View style={styles.triggerLabel}>{children}</View>
      <AccordionChevron expanded={item.isExpanded} />
    </Pressable>
  );
}

function AccordionChevron({ expanded }: { expanded: boolean }) {
  const accordion = useAccordionContext();
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    if (accordion.reducedMotion) {
      rotation.setValue(expanded ? 1 : 0);
      return;
    }
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, accordion.reducedMotion, rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ transform: [{ rotate }] }}
    >
      <ChevronDown size={16} color={Colors.textTertiary} />
    </Animated.View>
  );
}

export interface AccordionContentProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function AccordionContent({
  style,
  children,
}: AccordionContentProps) {
  const item = useItemContext();
  if (!item.isExpanded) return null;
  return (
    <View nativeID={item.panelId} style={[styles.content, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  accordion: {
    width: '100%',
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing['4'],
    minHeight: TouchTarget,
    paddingVertical: Spacing['1'],
    paddingHorizontal: Spacing['1'],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  triggerPressed: {
    opacity: 0.65,
  },
  triggerFocused: {
    borderColor: Colors.primary,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerLabel: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
    paddingBottom: Spacing['2'],
    paddingHorizontal: Spacing['1'],
    gap: Spacing['2'],
  },
});
