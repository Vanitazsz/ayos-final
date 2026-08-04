import { styles } from './PaymentIdScreen.styles';
import { View, Text, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react-native';
import type { usePaymentIdScreenController } from '../hooks/usePaymentIdScreenController';
import { formatPesoWithSpace } from '@/utils/format';
const PAYMENT_METHODS = [
  {
    id: 'cash',
    title: 'Cash on Service',
    icon: Banknote,
    color: theme.colors.success,
    available: true,
  },
  {
    id: 'gcash',
    title: 'GCash',
    icon: Smartphone,
    color: '#0052cc',
    available: false,
  },
  {
    id: 'maya',
    title: 'Maya',
    icon: Smartphone,
    color: '#00e57b',
    available: false,
  },
  {
    id: 'cc',
    title: 'Credit / Debit Card',
    icon: CreditCard,
    color: theme.colors.primary,
    available: false,
  },
];
export function PaymentView({
  model,
}: {
  model: ReturnType<typeof usePaymentIdScreenController>;
}) {
  const {
    router,
    id,
    selectedMethod,
    setSelectedMethod,
    loading,
    amount,
    homeownerCharge,
    error,
    total,
    handlePayment,
  } = model;
  return (
    <Screen safeArea scrollable>
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.layout.screenPadding },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text
          style={[theme.typography.h4, { color: theme.colors.textPrimary }]}
        >
          Payment
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <Text
            style={[
              theme.typography.label,
              {
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            Total Amount Due
          </Text>
          <Text
            style={[
              theme.typography.h1,
              { color: theme.colors.primary, marginBottom: theme.spacing.md },
            ]}
          >
            {amount == null
              ? 'Price pending'
              : formatPesoWithSpace(total)}
          </Text>

          <View style={styles.summaryRow}>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              Service
            </Text>
            <Text style={theme.typography.body2}>
              {amount == null
                ? 'Price pending'
                : formatPesoWithSpace(amount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text
              style={[
                theme.typography.body2,
                { color: theme.colors.textSecondary },
              ]}
            >
              Homeowner charge
            </Text>
            <Text style={theme.typography.body2}>
              {formatPesoWithSpace(homeownerCharge)}
            </Text>
          </View>
        </View>

        <Text
          style={[theme.typography.h3, { marginVertical: theme.spacing.md }]}
        >
          Select Payment Method
        </Text>

        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          const cardStyle = [
            styles.methodCard,
            isSelected && {
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.infoBackground,
            },
            !method.available && { opacity: 0.6 },
          ];

          return (
            <TouchableOpacity
              key={method.id}
              style={cardStyle}
              onPress={() => method.available && setSelectedMethod(method.id)}
              disabled={!method.available}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: method.available
                      ? `${method.color}20`
                      : theme.colors.border,
                  },
                ]}
              >
                <Icon
                  color={
                    method.available ? method.color : theme.colors.textSecondary
                  }
                  size={24}
                />
              </View>
              <View style={styles.methodTitle}>
                <Text
                  style={[
                    theme.typography.h4,
                    {
                      color: method.available
                        ? theme.colors.textPrimary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {method.title}
                </Text>
                {!method.available && (
                  <Text
                    style={[
                      theme.typography.caption,
                      { color: theme.colors.textSecondary, marginTop: 2 },
                    ]}
                  >
                    Unavailable
                  </Text>
                )}
              </View>
              {method.available && (
                <View
                  style={[
                    styles.radio,
                    !isSelected && { borderColor: theme.colors.border },
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        {error ? (
          <Text
            style={{
              color: theme.colors.error,
              marginBottom: theme.spacing.sm,
            }}
          >
            {error}
          </Text>
        ) : null}
        <Button
          title={`Confirm cash payment ${formatPesoWithSpace(total)}`}
          onPress={handlePayment}
          disabled={!selectedMethod || amount == null}
          loading={loading}
          fullWidth
        />
      </View>
    </Screen>
  );
}
