import { fetchPaymentForBooking } from '../logic/PaymentSuccessScreenLogic';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export function usePaymentSuccessScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (bookingId)
      void fetchPaymentForBooking(bookingId).then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else if (result.data?.status !== 'SUCCESSFUL')
          setError('Cash payment is still waiting for both confirmations.');
        else setPayment(result.data);
      });
    return () => {
      active = false;
    };
  }, [bookingId]);
  const receipt = Array.isArray(payment?.receipts)
    ? payment.receipts[0]
    : payment?.receipts;
  const displayAmount = Number(payment?.service_amount);
  const displayRef = receipt?.receipt_number ?? '';
  const displayDate = payment?.successful_at
    ? new Date(payment.successful_at).toLocaleString()
    : '';
  return { router, id, payment, error, displayAmount, displayRef, displayDate };
}
