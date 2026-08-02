import {
  confirmCashPayment,
  fetchBookingDetail,
  fetchPlatformFeeSettings,
} from '../logic/PaymentIdScreenLogic';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export function usePaymentIdScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [selectedMethod, setSelectedMethod] = useState<string | null>('cash');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
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
          const agreedAmount = result.data?.agreed_service_amount;
          if (agreedAmount == null || Number(agreedAmount) <= 0) {
            setError('A worker price must be agreed before payment.');
            setAmount(null);
          } else {
            setAmount(Number(agreedAmount));
          }
        }
        if (!fees.error) setHomeownerCharge(fees.data.homeownerCharge ?? 0);
      });
  }, [bookingId]);
  const total = (amount ?? 0) + homeownerCharge;
  const handlePayment = async () => {
    if (!selectedMethod || !bookingId) return;
    setLoading(true);
    setError('');
    try {
      const payment = await confirmCashPayment(bookingId);
      if (payment.status === 'SUCCESSFUL') {
        router.push(`/payment/success?id=${bookingId}`);
      } else {
        setError(
          'Your confirmation was recorded. Waiting for the worker to confirm receipt.',
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Cash payment confirmation failed.',
      );
    } finally {
      setLoading(false);
    }
  };
  return {
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
  };
}
