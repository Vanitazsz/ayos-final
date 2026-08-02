import { styles } from './OrderScreen.styles';
import { View, ScrollView, Pressable } from 'react-native';
import {
  ChevronLeft,
  Calendar,
  Navigation,
  Tag,
  Wrench,
} from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import type { useOrderScreenController } from '../hooks/useOrderScreenController';

export function OrderDetailsView({
  model,
}: {
  model: ReturnType<typeof useOrderScreenController>;
}) {
  const { booking, request, provider, handleBack, handleTrack } = model;
  return (
    <View style={styles.container}>
      {/* Consistent Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>
          Order Details
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Alert */}
        <View style={styles.statusAlert}>
          <AppText variant="h4" weight="bold" color={Colors.white}>
            Service in Progress
          </AppText>
          <AppText
            variant="bodySm"
            color={Colors.white}
            style={{ opacity: 0.9 }}
          >
            Your provider is assigned and handling your request.
          </AppText>
        </View>

        {/* Job Summary */}
        <View style={styles.section}>
          <AppText variant="h3" weight="bold" style={styles.sectionTitle}>
            Job Summary
          </AppText>
          <View style={styles.card}>
            <View style={styles.row}>
              <Tag size={18} color={Colors.primary} />
              <AppText variant="body" weight="semiBold" style={styles.rowText}>
                {request.service_categories?.name || 'Service request'}
              </AppText>
            </View>
            <View style={[styles.row, { marginTop: Spacing[3] }]}>
              <Calendar size={18} color={Colors.primary} />
              <AppText variant="body" weight="semiBold" style={styles.rowText}>
                {request.scheduled_at
                  ? new Date(request.scheduled_at).toLocaleString()
                  : 'Schedule unavailable'}
              </AppText>
            </View>
            <View style={styles.divider} />
            <AppText variant="body" color={Colors.textSecondary}>
              {request.description || 'No description provided.'}
            </AppText>
          </View>
        </View>

        {/* Replacement Parts */}
        {request.notes && (
          <View style={styles.section}>
            <AppText variant="h3" weight="bold" style={styles.sectionTitle}>
              Replacement Parts
            </AppText>
            <View style={styles.card}>
              <View style={styles.row}>
                <Wrench size={18} color={Colors.warning} />
                <AppText
                  variant="body"
                  weight="semiBold"
                  style={[styles.rowText, { color: Colors.warning }]}
                >
                  Request notes
                </AppText>
              </View>
              {request.notes ? (
                <AppText
                  variant="body"
                  color={Colors.textSecondary}
                  style={{ marginTop: Spacing[2] }}
                >
                  {request.notes}
                </AppText>
              ) : null}
            </View>
          </View>
        )}

        {/* Provider Details */}
        <View style={styles.section}>
          <AppText variant="h3" weight="bold" style={styles.sectionTitle}>
            Assigned Provider
          </AppText>
          <View style={styles.card}>
            <View style={styles.providerRow}>
              <Avatar uri={provider.avatarUri} size={56} />
              <View style={styles.providerInfo}>
                <AppText variant="h4" weight="bold">
                  {provider.name}
                </AppText>
                <AppText variant="bodySm" color={Colors.textSecondary}>
                  {provider.category}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Price & Payment */}
        <View style={styles.section}>
          <AppText variant="h3" weight="bold" style={styles.sectionTitle}>
            Payment
          </AppText>
          <View style={styles.card}>
            <View style={styles.priceRow}>
              <AppText variant="body">Total Amount</AppText>
              <AppText variant="h3" weight="bold" color={Colors.cta}>
                {booking?.agreed_service_amount == null
                  ? 'Price pending'
                  : `₱${Number(booking.agreed_service_amount).toLocaleString()}`}
              </AppText>
            </View>
            <AppText
              variant="caption"
              color={Colors.success}
              style={{ textAlign: 'right', marginTop: 4 }}
            >
              {booking?.status === 'COMPLETED'
                ? 'Ready for cash confirmation'
                : 'Cash due after completion'}
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View style={styles.footer}>
        <AppButton
          label="View Live Tracking"
          size="xl"
          fullWidth
          onPress={handleTrack}
          leftIcon={<Navigation size={20} color={Colors.white} />}
        />
      </View>
    </View>
  );
}
