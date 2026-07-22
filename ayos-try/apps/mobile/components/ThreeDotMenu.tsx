import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { MoreVertical, Flag, XCircle } from 'lucide-react-native';
import { Colors, Radius, Spacing, Elevation, IconSize, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';

interface ThreeDotMenuProps {
  onReportUser: () => void;
  onCancelService: () => void;
}

export const ThreeDotMenu = React.memo(function ThreeDotMenu({
  onReportUser,
  onCancelService,
}: ThreeDotMenuProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleReportUser = () => {
    setIsVisible(false);
    onReportUser();
  };

  const handleCancelService = () => {
    setIsVisible(false);
    onCancelService();
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setIsVisible(true)}
        hitSlop={12}
      >
        <MoreVertical size={IconSize.lg} color={Colors.textPrimary} />
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setIsVisible(false)}
        >
          <Pressable
            style={styles.menu}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              style={styles.menuItem}
              onPress={handleReportUser}
            >
              <Flag size={18} color={Colors.textSecondary} />
              <AppText variant="body" color={Colors.textPrimary}>
                Report User
              </AppText>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.menuItem}
              onPress={handleCancelService}
            >
              <XCircle size={18} color={Colors.error} />
              <AppText variant="body" color={Colors.error}>
                Cancel Service
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.full,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Spacing['16'],
    paddingRight: Spacing['5'],
  },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing['2'],
    minWidth: 180,
    ...Elevation.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['4'],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing['4'],
  },
});
