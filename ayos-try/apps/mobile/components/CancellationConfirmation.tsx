import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';

interface CancellationConfirmationProps {
  visible: boolean;
  customerName: string;
  onViewBookings: () => void;
}

export const CancellationConfirmation = React.memo(function CancellationConfirmation({
  visible,
  customerName,
  onViewBookings,
}: CancellationConfirmationProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <CheckCircle size={48} color={Colors.verified} />
          </View>
          
          <AppText variant="h3" weight="bold" align="center" style={styles.title}>
            Reason Sent to Customer
          </AppText>
          
          <AppText variant="body" color={Colors.textSecondary} align="center" style={styles.description}>
            Your cancellation reason has been shared with {customerName}. The booking has been cancelled.
          </AppText>
          
          <AppButton
            label="View Cancelled Bookings"
            variant="primary"
            fullWidth
            onPress={onViewBookings}
          />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: Spacing['6'],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: Spacing['4'],
    ...Elevation.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.verifiedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing['2'],
  },
  description: {
    marginBottom: Spacing['2'],
  },
});
