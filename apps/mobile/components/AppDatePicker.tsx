import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar, ChevronDown, Check, X } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { AppText } from './AppText';

export interface AppDatePickerProps {
  label?: string;
  value: string; // MM/DD/YYYY format
  onChange: (dateStr: string, dateObj?: Date) => void;
  error?: string;
  helperText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: any;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  label = 'Birthday',
  value,
  onChange,
  error,
  helperText = 'Format: MM/DD/YYYY (Must be at least 18 years old)',
  minimumDate = new Date(1920, 0, 1),
  maximumDate = new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()),
  containerStyle,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Helper to parse MM/DD/YYYY to Date object
  const parseDate = (str: string): Date => {
    if (!str) return maximumDate || new Date(1998, 0, 1);
    const parts = str.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0], 10) - 1;
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return maximumDate || new Date(1998, 0, 1);
  };

  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  const formatDateToString = (d: Date): string => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const handleOpenPicker = () => {
    setTempDate(parseDate(value));
    setShowPicker(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(formatDateToString(selectedDate), selectedDate);
      }
    } else if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirmIOS = () => {
    setShowPicker(false);
    onChange(formatDateToString(tempDate), tempDate);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="label" weight="medium" style={styles.label}>
          {label}
        </AppText>
      )}

      {/* Pressable Trigger Field */}
      <Pressable
        onPress={handleOpenPicker}
        style={({ pressed }) => [
          styles.inputWrapper,
          {
            borderColor: error ? Colors.error : Colors.border,
            backgroundColor: error ? Colors.errorBg : Colors.white,
          },
          pressed && styles.pressed,
        ]}
      >
        <Calendar size={20} color={error ? Colors.error : Colors.primary} style={styles.leftIcon} />
        <AppText
          variant="body"
          color={value ? Colors.textPrimary : Colors.textTertiary}
          style={{ flex: 1 }}
        >
          {value || 'Select date of birth (MM/DD/YYYY)'}
        </AppText>
        <ChevronDown size={18} color={Colors.textTertiary} />
      </Pressable>

      {/* Helper text / Error message */}
      {error ? (
        <AppText variant="caption" color={Colors.error} weight="bold" style={styles.helperText}>
          ⚠️ {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" color={Colors.textSecondary} style={styles.helperText}>
          {helperText}
        </AppText>
      ) : null}

      {/* Android Native Picker */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleDateChange}
        />
      )}

      {/* iOS Modal Picker */}
      {showPicker && Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.headerButton}>
                  <X size={20} color={Colors.textSecondary} />
                  <AppText variant="bodySm" color={Colors.textSecondary} style={{ marginLeft: 4 }}>
                    Cancel
                  </AppText>
                </TouchableOpacity>
                <AppText variant="body" weight="bold">
                  Select Birthday
                </AppText>
                <TouchableOpacity onPress={handleConfirmIOS} style={styles.headerButton}>
                  <Check size={20} color={Colors.primary} />
                  <AppText variant="bodySm" weight="bold" color={Colors.primary} style={{ marginLeft: 4 }}>
                    Done
                  </AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={handleDateChange}
                  style={{ width: '100%', height: 200 }}
                  textColor={Colors.textPrimary}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Web / Fallback Picker */}
      {showPicker && Platform.OS === 'web' && (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <AppText variant="body" weight="bold" style={{ marginBottom: 12 }}>
                Select Birthday
              </AppText>
              <input
                type="date"
                value={
                  tempDate
                    ? `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    const [yyyy, mm, dd] = e.target.value.split('-');
                    const newD = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
                    setTempDate(newD);
                    onChange(formatDateToString(newD), newD);
                    setShowPicker(false);
                  }
                }}
                style={{
                  fontSize: 16,
                  padding: 8,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  width: '100%',
                  marginBottom: 16,
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={{
                  backgroundColor: Colors.primary,
                  padding: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <AppText variant="bodySm" color={Colors.white} weight="bold">
                  Close
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing['4'],
  },
  label: {
    marginBottom: Spacing['2'],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing['4'],
    minHeight: 52,
  },
  pressed: {
    opacity: 0.8,
  },
  leftIcon: {
    marginRight: Spacing['3'],
  },
  helperText: {
    marginTop: Spacing['1'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing['4'],
    paddingBottom: Spacing['6'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['4'],
    paddingBottom: Spacing['2'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['1'],
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
