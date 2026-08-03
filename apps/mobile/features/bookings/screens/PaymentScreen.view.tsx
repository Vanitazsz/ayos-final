import { styles } from './PaymentScreen.styles';
import { View, ScrollView, Pressable, Image } from 'react-native';
import {
  ChevronLeft,
  CreditCard,
  Wallet,
  Banknote,
  Check,
  Info,
} from 'lucide-react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import type { usePaymentScreenController } from '../hooks/usePaymentScreenController';

export function PaymentView({
  model,
}: {
  model: ReturnType<typeof usePaymentScreenController>;
}) {
  const {
    selectedMethod,
    setSelectedMethod,
    selectedWorker,
    handleBack,
    handlePay,
  } = model;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <AppText variant="h4" weight="bold" style={styles.headerTitle}>
          Confirm Booking
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Booking Details Card */}
        <View style={styles.section}>
          <View style={styles.bookingCard}>
            <View style={styles.bookingCardHeader}>
              <View style={styles.bookingCardInfo}>
                <AppText variant="h4" weight="bold" style={{ marginBottom: 4 }}>
                  {selectedWorker.category}
                </AppText>
                <View style={styles.dateRow}>
                  <Avatar uri={selectedWorker.avatarUri} size={24} />
                  <AppText
                    variant="bodySm"
                    color={Colors.textSecondary}
                    style={{ marginLeft: 8 }}
                  >
                    {selectedWorker.name}
                  </AppText>
                </View>
              </View>
              <Image
                source={{ uri: selectedWorker.avatarUri }}
                style={styles.serviceImage}
              />
            </View>

            <View style={styles.summaryRow}>
              <AppText variant="body" color={Colors.textSecondary}>
                Service estimate
              </AppText>
              <AppText variant="body" weight="semiBold">
                {selectedWorker.price}
              </AppText>
            </View>
            <View style={[styles.summaryRow, { marginTop: Spacing['2'] }]}>
              <AppText variant="body" color={Colors.textSecondary}>
                Payment timing
              </AppText>
              <AppText variant="body" weight="semiBold">
                After completion
              </AppText>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <AppText variant="h4" weight="bold">
                Total
              </AppText>
              <AppText variant="h3" weight="bold" color={Colors.textPrimary}>
                {selectedWorker.price}
              </AppText>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <AppText
            variant="h4"
            weight="bold"
            style={{ marginBottom: Spacing['3'] }}
          >
            Payment Method
          </AppText>
          <View style={styles.methodsList}>
            {/* Online methods remain disabled until their providers are configured. */}

            <Pressable
              disabled
              style={[
                styles.methodCard,
                {
                  borderColor:
                    selectedMethod === 'gcash'
                      ? Colors.textPrimary
                      : Colors.border,
                },
              ]}
            >
              <View style={styles.methodIcon}>
                <Wallet size={24} color={Colors.textPrimary} strokeWidth={2} />
              </View>
              <View style={styles.methodInfo}>
                <AppText variant="body" weight="semiBold">
                  GCash
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Unavailable
                </AppText>
              </View>
              {selectedMethod === 'gcash' ? (
                <View style={styles.selectedCircle}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>

            <Pressable
              disabled
              style={[
                styles.methodCard,
                {
                  borderColor:
                    selectedMethod === 'visa'
                      ? Colors.textPrimary
                      : Colors.border,
                },
              ]}
            >
              <View style={styles.methodIcon}>
                <CreditCard
                  size={24}
                  color={Colors.textPrimary}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.methodInfo}>
                <AppText variant="body" weight="semiBold">
                  Credit / Debit Card
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Unavailable
                </AppText>
              </View>
              {selectedMethod === 'visa' ? (
                <View style={styles.selectedCircle}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setSelectedMethod('cash')}
              style={[
                styles.methodCard,
                {
                  borderColor:
                    selectedMethod === 'cash'
                      ? Colors.textPrimary
                      : Colors.border,
                },
              ]}
            >
              <View style={styles.methodIcon}>
                <Banknote
                  size={24}
                  color={Colors.textPrimary}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.methodInfo}>
                <AppText variant="body" weight="semiBold">
                  Cash on Service
                </AppText>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Pay directly to provider
                </AppText>
              </View>
              {selectedMethod === 'cash' ? (
                <View style={styles.selectedCircle}>
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </View>
              ) : (
                <View style={styles.unselectedCircle} />
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        {/* Security Note */}
        <View style={styles.securityNote}>
          <Info size={20} color={Colors.success} strokeWidth={2} />
          <AppText variant="bodySm" color={Colors.success} style={{ flex: 1 }}>
            Online payment will be held and only released after the job is
            completed.
          </AppText>
        </View>

        <AppButton
          label="Continue with Cash on Service"
          size="xl"
          fullWidth
          onPress={handlePay}
          style={{
            backgroundColor: Colors.textPrimary,
            borderRadius: Radius.lg,
          }}
          labelStyle={{ color: Colors.white }}
        />
      </View>
    </View>
  );
}
