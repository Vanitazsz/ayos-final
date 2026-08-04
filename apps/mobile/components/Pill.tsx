import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PillProps {
  label: string;
  textColor: string;
  bg: string;
}

export function Pill({ label, textColor, bg }: PillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
