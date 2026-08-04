import { styles } from './NewRequestSuccessScreen.styles';
import { View, ScrollView } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import type { useNewRequestSuccessScreenController } from '../hooks/useNewRequestSuccessScreenController';

export function RequestSuccessView({
  model,
}: {
  model: ReturnType<typeof useNewRequestSuccessScreenController>;
}) {
  const { handleBackToHome } = model;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color={Colors.success} strokeWidth={1.5} />
        </View>

        <AppText variant="h2" weight="bold" align="center" style={styles.title}>
          Request Posted Successfully!
        </AppText>

        <AppText
          variant="body"
          color={Colors.textSecondary}
          align="center"
          style={styles.subtitle}
        >
          Your request is now live in the marketplace. Verified workers in your
          area can now view your request and accept it through live matching.
        </AppText>

        <View style={styles.statusBox}>
          <AppText
            variant="h4"
            weight="bold"
            align="center"
            style={styles.statusBoxTitle}
          >
            What happens next?
          </AppText>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <AppText
              variant="bodySm"
              color={Colors.textSecondary}
              style={styles.stepText}
            >
              Wait for workers to apply
            </AppText>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <AppText
              variant="bodySm"
              color={Colors.textSecondary}
              style={styles.stepText}
            >
              Review their profiles and chat with them
            </AppText>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <AppText
              variant="bodySm"
              color={Colors.textSecondary}
              style={styles.stepText}
            >
              Accept the best worker and proceed to payment
            </AppText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label="Back to Home"
          onPress={handleBackToHome}
          variant="ghost"
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}
