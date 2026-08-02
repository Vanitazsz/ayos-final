import {
  blockAccount,
  confirmJobCompletion,
  fetchBookingTracking,
  openBookingDispute,
  reportBookingParticipant,
  subscribeToTable,
  subscribeToEnRouteLocation,
  type LiveEnRouteLocation,
  createRealtimeRefreshController,
  fetchAccountMobile,
} from '../logic/TrackingIdScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Clock, MapPin, Wrench } from 'lucide-react-native';
const STATUS_STEP_MAP: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  WORKER_PREPARING: 1,
  WORKER_EN_ROUTE: 2,
  WORKER_ARRIVED: 3,
  SERVICE_STARTED: 4,
  IN_PROGRESS: 4,
  PENDING_CONFIRMATION: 4,
  COMPLETED: 5,
};

const STATUS_INFO: Record<
  string,
  { title: string; subtitle: string; icon: any }
> = {
  PENDING: {
    title: 'Waiting for Provider',
    subtitle: 'Your booking has been sent. A provider will accept shortly.',
    icon: Clock,
  },
  ACCEPTED: {
    title: 'Provider Accepted',
    subtitle: 'Your provider has accepted the job and is getting ready.',
    icon: CheckCircle2,
  },
  WORKER_PREPARING: {
    title: 'Provider Preparing',
    subtitle: 'Your provider is preparing to head to your location.',
    icon: Clock,
  },
  WORKER_EN_ROUTE: {
    title: 'Provider On The Way',
    subtitle: 'Your provider is en route to your location.',
    icon: MapPin,
  },
  WORKER_ARRIVED: {
    title: 'Provider Has Arrived',
    subtitle: 'Your provider has arrived at your location.',
    icon: MapPin,
  },
  SERVICE_STARTED: {
    title: 'Service In Progress',
    subtitle: 'Work has begun on your service request.',
    icon: Wrench,
  },
  IN_PROGRESS: {
    title: 'Service In Progress',
    subtitle: 'Work is currently being done.',
    icon: Wrench,
  },
  PENDING_CONFIRMATION: {
    title: 'Confirm Job Completion',
    subtitle: 'Your provider marked the job complete. Please confirm the work.',
    icon: Clock,
  },
  COMPLETED: {
    title: 'Service Completed',
    subtitle: 'Your service has been completed. Please confirm and pay.',
    icon: CheckCircle2,
  },
  CANCELLED: {
    title: 'Booking Cancelled',
    subtitle: 'This booking has been cancelled.',
    icon: Clock,
  },
};
export function useTrackingIdScreenController() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [tracking, setTracking] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [liveLocation, setLiveLocation] = useState<LiveEnRouteLocation | null>(
    null,
  );
  const bookingId = Array.isArray(id) ? id[0] : id;
  useEffect(() => {
    if (!bookingId) return;
    const stopBroadcast = subscribeToEnRouteLocation(bookingId, (loc) => {
      setLiveLocation(loc);
    });
    return () => {
      stopBroadcast();
    };
  }, [bookingId]);
  const workerStatus = tracking?.booking?.status as string | undefined;
  useEffect(() => {
    if (!bookingId) return;
    let active = true;
    const load = () =>
      void fetchBookingTracking(bookingId)
        .then((nextTracking) => {
          if (active) setTracking(nextTracking);
        })
        .catch(() => {
          if (active) setTracking(null);
        });
    const refreshController = createRealtimeRefreshController(load, {
      coalesceMs: 250,
      fallbackMs: 60_000,
    });
    load();
    const stopLocation = subscribeToTable(
      'location_updates',
      refreshController.request,
      `booking_id=eq.${bookingId}`,
      (status) => refreshController.setStatus('location', status),
    );
    const stopBooking = subscribeToTable(
      'bookings',
      refreshController.request,
      `id=eq.${bookingId}`,
      (status) => refreshController.setStatus('booking', status),
    );
    const stopStatusEvents = subscribeToTable(
      'booking_status_events',
      refreshController.request,
      `booking_id=eq.${bookingId}`,
      (status) => refreshController.setStatus('status-events', status),
    );
    return () => {
      active = false;
      refreshController.stop();
      stopLocation();
      stopBooking();
      stopStatusEvents();
    };
  }, [bookingId]);
  const stepIndex = useMemo(() => {
    return workerStatus && STATUS_STEP_MAP[workerStatus] !== undefined
      ? STATUS_STEP_MAP[workerStatus]
      : 0;
  }, [workerStatus]);
  const handlePayment = () => {
    router.push(`/payment/${id}`);
  };
  const handleConfirmCompletion = async () => {
    if (!bookingId || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmJobCompletion(bookingId);
      setTracking(await fetchBookingTracking(bookingId));
    } catch (error) {
      Alert.alert(
        'Confirmation failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsConfirming(false);
    }
  };
  const address = tracking?.booking?.service_requests?.addresses;
  const latest = tracking?.updates?.[0];
  const statusInfo = STATUS_INFO[workerStatus ?? ''] ?? {
    title: workerStatus?.replaceAll('_', ' ') ?? 'Loading...',
    subtitle: '',
    icon: Clock,
  };
  const StatusIcon = statusInfo.icon;
  const isCompleted = workerStatus === 'COMPLETED';
  const isPendingConfirmation = workerStatus === 'PENDING_CONFIRMATION';
  const isCancelled = workerStatus === 'CANCELLED';
  const isActive = !isCompleted && !isCancelled;
  const contactAvailable = workerStatus !== 'PENDING';
  const workerAccountId = tracking?.booking?.worker_account_id as
    | string
    | undefined;
  const reportWorker = () =>
    Alert.alert(
      'Report provider',
      'Submit a conduct report for administrator review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit report',
          style: 'destructive',
          onPress: () =>
            void reportBookingParticipant(
              bookingId,
              `Customer submitted a conduct concern for booking ${bookingId}. Administrator review is required.`,
            )
              .then(() =>
                Alert.alert(
                  'Report submitted',
                  'An administrator can now review this booking.',
                ),
              )
              .catch((error) => Alert.alert('Report failed', error.message)),
        },
      ],
    );
  const blockWorker = () => {
    if (!workerAccountId) return;
    Alert.alert(
      'Block provider',
      'This provider will be excluded from your future matches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            void blockAccount(
              workerAccountId,
              `Blocked from booking ${bookingId}`,
            )
              .then(() =>
                Alert.alert(
                  'Provider blocked',
                  'This provider will not appear in future matches.',
                ),
              )
              .catch((error) => Alert.alert('Block failed', error.message)),
        },
      ],
    );
  };
  const disputeBooking = () =>
    Alert.alert(
      'Open dispute',
      'Open a dispute for administrator review of this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open dispute',
          onPress: () =>
            void openBookingDispute(
              bookingId,
              `Customer requested administrator review for booking ${bookingId}.`,
            )
              .then(() =>
                Alert.alert(
                  'Dispute opened',
                  'An administrator can now review the booking record.',
                ),
              )
              .catch((error) => Alert.alert('Dispute failed', error.message)),
        },
      ],
    );
  return {
    router,
    id,
    tracking,
    isConfirming,
    liveLocation,
    bookingId,
    workerStatus,
    stepIndex,
    handlePayment,
    handleConfirmCompletion,
    address,
    latest,
    statusInfo,
    StatusIcon,
    isCompleted,
    isPendingConfirmation,
    isCancelled,
    isActive,
    contactAvailable,
    workerAccountId,
    reportWorker,
    blockWorker,
    disputeBooking,
    fetchAccountMobile,
  };
}
