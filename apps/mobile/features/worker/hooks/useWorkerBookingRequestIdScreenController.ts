import {
  selectImage,
  getCurrentCoordinates,
  acceptJob,
  attachBookingProof,
  arriveAtJob,
  completeJob,
  confirmCashPayment,
  confirmWorkerArrival,
  declineAssignedBooking,
  departForJob,
  fetchBookingDetail,
  markJobInProgress,
  prepareJob,
  reportBookingParticipant,
  startJob,
  subscribeToTable,
  startEnRouteLocationPublisher,
  stopEnRouteLocationPublisher,
  uploadBookingProof,
  viewBookingStatus,
  bookingDurationLabel,
  formatScheduleTime,
  formatBookingPrice,
  isUrgentScheduled,
  formatDate,
  formatAddressParts,
  type WorkerBooking,
} from '../logic/WorkerBookingRequestIdScreenLogic';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useWorkerBookingStore } from '@/store/useWorkerBookingStore';
import { resolveWorkerEarningsAmount } from '@/utils/bookingPayment';
import { shouldTransitionToArrivedAfterProximityCheck } from '@/utils/arrivalTransition';
export function useWorkerBookingRequestIdScreenController() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<any>({
    id,
    service: '',
    customerName: '',
    customerAvatar: '',
    urgency: 'normal',
    description: '',
    location: '',
    imageUrl: null,
  });
  const [booking, setBooking] = useState<WorkerBooking>({
    id: id ?? '',
    customerName: '',
    customerAvatar: '',
    service: '',
    date: '',
    time: '',
    address: '',
    price: '',
    status: 'hired',
    distance: '',
    lat: 0,
    lng: 0,
    hourlyRate: 0,
  });
  const [isArriving, setIsArriving] = useState(false);
  const [backendStatus, setBackendStatus] = useState('PENDING');
  const [duration, setDuration] = useState('Not recorded');
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('UNCONFIRMED');
  const setStoreStatus = useWorkerBookingStore((s) => s.setStatus);
  useEffect(() => {
    if (!id) return;
    const load = () =>
      void fetchBookingDetail(id)
        .then((result) => {
          setIsLoading(false);
          if (result.error) {
            console.error(
              '[booking-detail] fetchBookingDetail failed:',
              result.error,
            );
            return;
          }
          const row = result.data;
          if (!row?.id) return;
          const request = row.service_requests;
          const payment = Array.isArray(row.payments)
            ? row.payments[0]
            : row.payments;
          setPaymentStatus(payment?.status ?? 'UNCONFIRMED');
          const earningsAmount = resolveWorkerEarningsAmount(
            row.agreed_service_amount,
            payment,
          );
          const address = request?.addresses;
          const status = viewBookingStatus(row.status);
          setDuration(bookingDurationLabel(row.accepted_at, row.completed_at));
          setBackendStatus(row.status);
          setRouteDetails({
            startLat: row.worker_start_lat,
            startLng: row.worker_start_lng,
            destinationLat: address?.latitude,
            destinationLng: address?.longitude,
            address: formatAddressParts([
              address?.line1,
              address?.barangay,
              address?.city,
            ]),
          });
          setBooking({
            id: row.id,
            customerName: row.user_profiles?.display_name ?? '',
            customerAvatar: row.user_profiles?.avatar_path ?? '',
            service: request?.service_categories?.name ?? '',
            date: formatDate(request?.scheduled_at),
            time: formatScheduleTime(request?.scheduled_at),
            address: formatAddressParts([
              address?.line1,
              address?.barangay,
              address?.city,
            ]),
            price: formatBookingPrice(earningsAmount),
            status,
            distance: '',
            lat: Number(address?.latitude ?? 0),
            lng: Number(address?.longitude ?? 0),
            hourlyRate: earningsAmount ?? 0,
          });
          setJob({
            id: request?.id,
            service: request?.service_categories?.name ?? '',
            customerName: row.user_profiles?.display_name ?? '',
            customerAvatar: row.user_profiles?.avatar_path ?? '',
            urgency: isUrgentScheduled(request?.scheduled_at)
              ? 'urgent'
              : 'normal',
            description: request?.description ?? '',
            location: formatAddressParts([
              address?.line1,
              address?.barangay,
              address?.city,
            ]),
            imageUrl: null,
          });
          setStoreStatus(row.id, status as any);
        })
        .catch((e) => {
          console.error('[booking-detail] load failed:', e);
          setIsLoading(false);
        });
    load();
    let unsub = () => {};
    try {
      unsub = subscribeToTable('bookings', load, `id=eq.${id}`);
    } catch (e) {
      console.warn('[booking-detail] realtime subscribe failed:', e);
    }
    return unsub;
  }, [id, setStoreStatus]);
  useEffect(() => {
    if (backendStatus === 'WORKER_EN_ROUTE' && booking.id) {
      void startEnRouteLocationPublisher(booking.id);
      return () => {
        stopEnRouteLocationPublisher();
      };
    }
  }, [backendStatus, booking.id]);
  const handleAccept = () =>
    void acceptJob(booking.id)
      .then(() => {
        setBackendStatus('ACCEPTED');
        setBooking((b) => ({ ...b, status: 'accepted' }));
      })
      .catch((error) => Alert.alert('Unable to accept', error.message))
      .catch((err: any) => {
        const msg = err?.message ?? err?.code ?? String(err);
        console.error('acceptJob error:', msg, err);
        Alert.alert('Accept failed', msg);
      });
  const handleDecline = async () => {
    try {
      await declineAssignedBooking(
        booking.id,
        'Worker declined the assigned booking',
      );
      setBackendStatus('CANCELLED');
      setBooking((b) => ({ ...b, status: 'cancelled' }));
      router.replace('/(worker)/bookings?filter=Cancelled');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('Decline error:', msg, error);
      Alert.alert('Decline failed', msg);
    }
  };
  const handleConfirmDetails = async () => {
    try {
      console.log('[handleConfirmDetails] booking.id:', booking.id);
      await prepareJob(booking.id);
      await departForJob(booking.id);
      void startEnRouteLocationPublisher(booking.id);
      setBackendStatus('WORKER_EN_ROUTE');
      setBooking((b) => ({ ...b, status: 'en_route' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleConfirmDetails error:', msg, error);
      Alert.alert('Start En Route failed', msg);
    }
  };
  const handleArrived = async () => {
    if (isArriving) return;
    setIsArriving(true);
    try {
      let locationWasAvailable = false;
      let withinProximity = false;
      const loc = await Promise.race([
        getCurrentCoordinates('balanced').catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (loc) {
        locationWasAvailable = true;
        const proximity = await confirmWorkerArrival(
          booking.id,
          loc.latitude,
          loc.longitude,
        );
        if (!proximity.error) {
          withinProximity = proximity.data?.within_proximity === true;
        }
        if (
          !proximity.error &&
          proximity.data &&
          !proximity.data.within_proximity
        ) {
          Alert.alert(
            'Outside Arrival Radius',
            proximity.data.message ||
              `You are ${proximity.data.distance_meters}m away. Please get within 50 meters of the customer address.`,
          );
          return;
        }
      }
      stopEnRouteLocationPublisher();
      if (
        shouldTransitionToArrivedAfterProximityCheck(
          locationWasAvailable,
          withinProximity,
        )
      ) {
        await arriveAtJob(booking.id);
      }
      await startJob(booking.id);
      await markJobInProgress(booking.id);
      setBackendStatus('IN_PROGRESS');
      setBooking((b) => ({ ...b, status: 'in_progress' }));
      router.replace('/(worker)/bookings?filter=In%20Progress');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleArrived error:', msg, error);
      Alert.alert('Arrived failed', msg);
    } finally {
      setIsArriving(false);
    }
  };
  const handleComplete = async () => {
    try {
      await completeJob(booking.id);
      setBackendStatus('PENDING_CONFIRMATION');
      setBooking((b) => ({ ...b, status: 'pending_review' }));
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleComplete error:', msg, error);
      Alert.alert('Complete failed', msg);
    }
  };
  const handleUploadProof = async () => {
    try {
      const picker = await selectImage({
        quality: 0.85,
        requirePermission: true,
      });
      if (!picker) return;
      const proof = await uploadBookingProof(picker.uri);
      await attachBookingProof(booking.id, proof);
      Alert.alert('Proof attached', 'The photo is tied to this booking.');
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? String(error);
      console.error('handleUploadProof error:', msg, error);
      Alert.alert('Upload failed', msg);
    }
  };
  const handleLeaveFeedback = () => {
    Alert.alert(
      'Worker feedback',
      'Detailed worker-to-customer feedback is not enabled. Use Report User for a safety or conduct concern.',
    );
  };
  const handleConfirmCash = async () => {
    try {
      const payment = await confirmCashPayment(booking.id);
      setPaymentStatus(payment.status);
      Alert.alert(
        payment.status === 'SUCCESSFUL'
          ? 'Cash payment confirmed'
          : 'Confirmation recorded',
        payment.status === 'SUCCESSFUL'
          ? 'Both parties confirmed the cash payment.'
          : 'Waiting for the customer to confirm the cash payment.',
      );
    } catch (error) {
      Alert.alert(
        'Confirmation failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };
  const handleReport = () => {
    Alert.alert('Report User', 'Submit a conduct report for this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        style: 'destructive',
        onPress: () =>
          void reportBookingParticipant(
            booking.id,
            `Worker submitted a conduct concern for booking ${booking.id}. Administrator review is required.`,
          )
            .then(() =>
              Alert.alert(
                'Report submitted',
                'The support team can now review this booking.',
              ),
            )
            .catch((error) => Alert.alert('Report failed', error.message)),
      },
    ]);
  };
  const handleCall = () =>
    Alert.alert(
      'Phone unavailable',
      'The customer has not shared a callable phone number. Use secure booking messages.',
    );
  const handleCancelService = () => {
    router.push(`/(worker)/cancel-service/${booking.id}`);
  };
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';
  const isActive = !isCompleted && !isCancelled;
  const remainingTime = '';
  return {
    id,
    job,
    booking,
    setBooking,
    isArriving,
    setBackendStatus,
    duration,
    routeDetails,
    isLoading,
    paymentStatus,
    handleDecline,
    handleAccept,
    handleConfirmDetails,
    handleArrived,
    handleComplete,
    handleUploadProof,
    handleLeaveFeedback,
    handleConfirmCash,
    handleReport,
    handleCall,
    handleCancelService,
    isCompleted,
    isCancelled,
    isActive,
    remainingTime,
    router,
  };
}
