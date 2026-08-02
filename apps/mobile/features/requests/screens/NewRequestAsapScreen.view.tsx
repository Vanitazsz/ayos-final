import { styles } from './NewRequestAsapScreen.styles';
import { View, ScrollView, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { JobSummary } from '@/components/JobSummary';
import type { useNewRequestAsapScreenController } from '../hooks/useNewRequestAsapScreenController';

export function ReviewRequestView({
  model,
}: {
  model: ReturnType<typeof useNewRequestAsapScreenController>;
}) {
  const {
    router,
    request,
    handleBack,
    handlePostRequest,
    getPrimaryButtonText,
  } = model;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>
          Review Request
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <JobSummary request={request} showEditButtons={true} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        <AppButton
          label="Edit Request Details"
          variant="outline"
          size="xl"
          fullWidth
          onPress={() => router.push('/new-request/create' as any)}
          style={{ marginBottom: Spacing['3'] }}
        />
        <AppButton
          label={getPrimaryButtonText()}
          size="xl"
          fullWidth
          onPress={handlePostRequest}
          style={{ backgroundColor: Colors.primary, borderRadius: Radius.lg }}
          labelStyle={{ color: Colors.white }}
        />
      </View>
    </View>
  );
}
