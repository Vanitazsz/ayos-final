import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppText } from './AppText';

export interface SelectOption {
  label: string;
  value: string;
}

interface AppSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const AppSelect: React.FC<AppSelectProps> = ({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Select an option',
  error,
  containerStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" weight="medium" color={Colors.textPrimary} style={styles.label}>
          {label}
        </AppText>
      )}

      <Pressable
        style={[
          styles.inputWrapper,
          {
            borderColor: error ? Colors.error : Colors.border,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <AppText
          variant="body"
          color={selectedOption ? Colors.textPrimary : Colors.textTertiary}
          style={styles.inputText}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </AppText>
        <ChevronDown size={20} color={Colors.textTertiary} />
      </Pressable>

      {error && (
        <AppText variant="caption" color={Colors.error} style={styles.errorText}>
          {error}
        </AppText>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText variant="h3" weight="bold">{label || 'Select Option'}</AppText>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <AppText
                    variant="body"
                    weight={item.value === value ? 'bold' : 'regular'}
                    color={item.value === value ? Colors.primary : Colors.textPrimary}
                  >
                    {item.label}
                  </AppText>
                  {item.value === value && <Check size={20} color={Colors.primary} />}
                </Pressable>
              )}
              contentContainerStyle={styles.listContainer}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  label: {
    marginBottom: Spacing['2'],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing['4'],
    minHeight: 52,
    backgroundColor: Colors.white,
  },
  inputText: {
    flex: 1,
  },
  errorText: {
    marginTop: Spacing['1'],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    paddingBottom: Spacing['8'],
  },
  modalHeader: {
    padding: Spacing['5'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listContainer: {
    padding: Spacing['4'],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
