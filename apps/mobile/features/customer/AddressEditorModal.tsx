import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';

interface AddressEditorModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export const AddressEditorModal = React.memo(
  function AddressEditorModal({
    visible,
    initialValue,
    onClose,
    onConfirm,
  }: AddressEditorModalProps) {
    const insets = useSafeAreaInsets();
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
      if (visible) setValue(initialValue);
    }, [visible, initialValue]);

    const handleConfirm = () => {
      onConfirm(value);
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View
            entering={SlideInDown}
            style={styles.sheet}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.sheetContent,
                { paddingBottom: insets.bottom + 12 },
              ]}
            >
              <View style={styles.header}>
                <Text style={theme.typography.h3}>Edit address</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close address editor"
                  onPress={onClose}
                  hitSlop={8}
                  style={styles.closeBtn}
                >
                  <X color={theme.colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>
              <TextInput
                label="Service address"
                placeholder="Enter complete address"
                value={value}
                onChangeText={setValue}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoCapitalize="sentences"
                style={styles.editor}
              />
              <Button
                title="Save address"
                onPress={handleConfirm}
                fullWidth
                size="lg"
                style={styles.saveBtn}
              />
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.cancelBtn}
                onPress={onClose}
              >
                <Text
                  style={[
                    theme.typography.button,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
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
    maxHeight: '90%',
  },
  sheetContent: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editor: {
    minHeight: 120,
    backgroundColor: theme.colors.surface,
  },
  saveBtn: {
    marginTop: theme.spacing.lg,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
});
