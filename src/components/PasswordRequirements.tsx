import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Colors, Spacing } from '@/constants/theme';
import { getPasswordRequirementState } from '@/utils/passwordRequirements';

interface PasswordRequirementsProps {
  password: string;
  confirmation?: string;
  showMatch?: boolean;
  incompleteColor?: string;
}

const labels = [
  ['minLength', 'At least 8 characters'],
  ['uppercase', 'One uppercase letter'],
  ['number', 'One number'],
  ['symbol', 'One symbol'],
] as const;

export function PasswordRequirements({
  password,
  confirmation,
  showMatch = false,
  incompleteColor = Colors.border,
}: PasswordRequirementsProps) {
  const state = getPasswordRequirementState(password, confirmation);
  const items = showMatch
    ? [...labels, ['matches', 'Passwords match'] as const]
    : labels;

  return (
    <View
      style={styles.container}
      accessibilityRole="list"
      accessibilityLabel="Password requirements"
    >
      {items.map(([key, label]) => {
        const complete = state[key];
        return (
          <View key={key} style={styles.item} accessibilityRole="text">
            {complete ? (
              <Check size={14} color={Colors.success} accessibilityLabel="Complete" />
            ) : (
              <Circle size={14} color={incompleteColor} accessibilityLabel="Incomplete" />
            )}
            <AppText
              variant="caption"
              color={complete ? Colors.success : Colors.textSecondary}
            >
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing['1'], marginTop: Spacing['2'], marginBottom: Spacing['3'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
});
