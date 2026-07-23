import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { theme } from '@/constants/theme';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react-native';
import {
  confirmCashPayment,
  fetchBookingDetail,
  fetchPlatformFeeSettings,
} from '@/services/api';

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

export default function PaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedMethod, setSelectedMethod] = useState<string | null>('cash');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(0);
  const [homeownerCharge, setHomeownerCharge] = useState(0);
  const [error, setError] = useState('');
  const bookingId = Array.isArray(id) ? id[0] : id;
  useEffect(() => {
    if (bookingId)
      void Promise.all([
        fetchBookingDetail(bookingId),
        fetchPlatformFeeSettings(),
      ]).then(([result, fees]) => {
        if (result.error) setError(result.error);
        else {
          const val = Number(
            result.data?.agreed_service_amount ??
              result.data?.service_requests?.budget ??
              1500,
          );
          setAmount(val > 0 ? val : 1500);
        }
        if (!fees.error) setHomeownerCharge(fees.data.homeownerCharge ?? 50);
      });
  }, [bookingId]);
  const total = amount + homeownerCharge;

  const handlePayment = async () => {
    if (!selectedMethod || !bookingId) return;
    setLoading(true);
    setError('');
    try {
      await confirmCashPayment(bookingId);
    } catch (cause) {
      console.warn('Cash payment RPC note:', cause);
    } finally {
      setLoading(false);
      router.push(`/payment/success?id=${bookingId}`);
    }
  };

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
            ₱ {total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
              ₱ {amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
              ₱{' '}
              {homeownerCharge.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
              })}
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
          title={`Confirm cash payment ₱ ${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          onPress={handlePayment}
          disabled={!selectedMethod}
          loading={loading}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: { flex: 1, paddingVertical: theme.spacing.md },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  methodTitle: { flex: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  errorBanner: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  footer: { paddingVertical: theme.spacing.md },
});
