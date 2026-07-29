import React from 'react';
import { View, StyleSheet, ViewStyle, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onSubmitEditing,
  style,
  autoFocus = false,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Search size={20} color={Colors.textTertiary} strokeWidth={2} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['4'],
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    marginLeft: Spacing['3'],
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
});
