import { styles } from './AcceptWorkerIdScreen.styles';
import { View, Pressable } from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import type { useAcceptWorkerIdScreenController } from '../hooks/useAcceptWorkerIdScreenController';

export function AcceptWorkerModalView({
  model,
}: {
  model: ReturnType<typeof useAcceptWorkerIdScreenController>;
}) {
  const { provider, handleHire, handleCancel } = model;
  return (
    <View style={styles.overlay}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h3" weight="bold">
            Hire This Worker?
          </AppText>
          <Pressable
            onPress={handleCancel}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Worker Info */}
        <View style={styles.workerInfo}>
          <Avatar uri={provider.avatarUri} size={60} />
          <View style={{ marginLeft: Spacing['3'], flex: 1 }}>
            <AppText variant="h4" weight="bold">
              {provider.name}
            </AppText>
            <AppText variant="bodySm" color={Colors.textSecondary}>
              {provider.category}
            </AppText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <AppText variant="body" weight="bold" color={Colors.cta}>
                {provider.price}
              </AppText>
            </View>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageBox}>
          <CheckCircle2
            size={24}
            color={Colors.cta}
            style={{ marginBottom: Spacing['2'] }}
          />
          <AppText variant="body" align="center" style={{ lineHeight: 22 }}>
            Once accepted,{' '}
            <AppText variant="body" weight="bold">
              {provider.name}
            </AppText>{' '}
            will be assigned to your request. Cash payment is confirmed after
            the service is completed.
          </AppText>
        </View>

        {/* Buttons */}
        <View style={styles.footer}>
          <AppButton
            label="Cancel"
            variant="outline"
            onPress={handleCancel}
            style={styles.actionBtn}
          />
          <AppButton
            label="Hire Worker"
            onPress={() => void handleHire()}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </View>
  );
}
