import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { Button } from '@/components/buttons/Button';
import { simulateMockGcashPayment } from '@/services/payments';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft, Camera } from 'lucide-react-native';

interface MockGCashPaymentProps {
  bookingId: string;
  totalAmount: number;
  hasReceipt?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentStep = 'countdown' | 'processing' | 'paid' | 'error';

export const MockGCashPayment: React.FC<MockGCashPaymentProps> = ({
  bookingId,
  totalAmount,
  hasReceipt,
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<PaymentStep>('countdown');
  const [errorMessage, setErrorMessage] = useState('');
  const isCancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanReference = bookingId.replaceAll('-', '').substring(0, 12).toUpperCase();
  const mockReference = `MOCK-GCASH-${cleanReference}`;
  const maskedAccount = '09** *** 1234';

  const startSimulation = React.useCallback(() => {
    setStep('countdown');
    setErrorMessage('');
    isCancelledRef.current = false;

    timerRef.current = setTimeout(async () => {
      if (isCancelledRef.current) return;
      setStep('processing');

      try {
        await simulateMockGcashPayment(bookingId, mockReference);
        if (isCancelledRef.current) return;
        setStep('paid');

        timerRef.current = setTimeout(() => {
          if (!isCancelledRef.current) {
            onSuccess();
          }
        }, 1000);
      } catch (error: any) {
        if (isCancelledRef.current) return;
        setStep('error');
        setErrorMessage(
          error?.message || 'Failed to complete GCash payment simulation. Please try again.',
        );
      }
    }, 2500);
  }, [bookingId, mockReference, onSuccess]);

  useEffect(() => {
    startSimulation();

    return () => {
      isCancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [startSimulation]);

  const handleBack = () => {
    isCancelledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onCancel();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Cancel payment">
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h4, { color: theme.colors.textPrimary }]}>
          GCash Express Pay (Simulation)
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Merchant / Bill Info */}
      <View style={styles.card}>
        <Text style={styles.merchantLabel}>Merchant</Text>
        <Text style={styles.merchantName}>A-YOS Services</Text>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Masked Account</Text>
          <Text style={styles.detailValue}>{maskedAccount}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reference No.</Text>
          <Text style={styles.detailValueBold} testID="mock-gcash-reference">
            {mockReference}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>
            ₱ {totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {hasReceipt && (
          <View style={styles.receiptBadge}>
            <Camera color={theme.colors.success} size={16} style={{ marginRight: 6 }} />
            <Text style={styles.receiptBadgeText}>Proof of Payment / Receipt Attached</Text>
          </View>
        )}
      </View>

      {/* Warning Banner */}
      <View style={styles.warningBox}>
        <ShieldAlert color="#d97706" size={20} style={{ marginRight: theme.spacing.xs }} />
        <Text style={styles.warningText}>
          Simulation Only: No real financial transaction or gateway integration is executed.
        </Text>
      </View>

      {/* Status Area */}
      <View style={styles.statusContainer}>
        {step === 'countdown' && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color="#0052cc" />
            <Text style={styles.statusText}>Initiating GCash Simulation (2.5s)...</Text>
          </View>
        )}

        {step === 'processing' && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color="#0052cc" />
            <Text style={styles.statusTextBold} testID="mock-gcash-processing">
              Processing Payment...
            </Text>
          </View>
        )}

        {step === 'paid' && (
          <View style={[styles.statusBox, styles.successBox]}>
            <CheckCircle2 color={theme.colors.success} size={44} />
            <Text style={styles.paidText} testID="mock-gcash-paid">
              Paid
            </Text>
          </View>
        )}

        {step === 'error' && (
          <View style={styles.errorBox}>
            <AlertTriangle color={theme.colors.error} size={32} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button
              title="Retry Payment"
              onPress={startSimulation}
              variant="outlined"
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        )}
      </View>

      {/* Cancel Button */}
      {(step === 'countdown' || step === 'error') && (
        <Button
          title="Cancel"
          variant="outlined"
          onPress={handleBack}
          fullWidth
          style={{ marginTop: theme.spacing.lg }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    padding: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  merchantLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  merchantName: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailLabel: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    ...theme.typography.body2,
    color: theme.colors.textPrimary,
  },
  detailValueBold: {
    ...theme.typography.body2,
    fontWeight: 'bold',
    color: '#0052cc',
  },
  amountValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    ...theme.typography.caption,
    color: '#92400e',
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    marginVertical: theme.spacing.md,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  statusTextBold: {
    ...theme.typography.h4,
    color: '#0052cc',
    marginTop: theme.spacing.md,
  },
  successBox: {
    padding: theme.spacing.md,
  },
  paidText: {
    ...theme.typography.h2,
    color: theme.colors.success,
    marginTop: theme.spacing.xs,
  },
  errorBox: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginTop: theme.spacing.sm,
  },
  receiptBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '600',
  },
});
