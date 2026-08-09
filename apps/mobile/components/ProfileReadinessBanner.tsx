import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Colors, Elevation, Radius, Spacing } from '@/constants/theme';

interface ProfileReadinessBannerProps {
  complete: boolean;
  missing: string[];
  onCompleteProfile: () => void;
  actionLabel?: string;
}

export function ProfileReadinessBanner({
  complete,
  missing,
  onCompleteProfile,
  actionLabel = 'Complete profile',
}: ProfileReadinessBannerProps) {
  if (complete) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <AlertCircle size={18} color={Colors.warning} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodySm" weight="bold">
          Save your profile before verification
        </AppText>
        <AppText variant="caption" color={Colors.textSecondary} style={styles.missing}>
          Add {missing.length > 0 ? missing.join(', ') : 'your profile details'}.
        </AppText>
        <AppButton
          title={actionLabel}
          variant="outline"
          size="sm"
          onPress={onCompleteProfile}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing['3'],
    padding: Spacing['4'],
    backgroundColor: Colors.warningBg,
    borderColor: 'rgba(245,166,35,0.3)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Elevation.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245,166,35,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  missing: { marginTop: Spacing['1'], lineHeight: 18 },
  button: { alignSelf: 'flex-start', marginTop: Spacing['3'] },
});
