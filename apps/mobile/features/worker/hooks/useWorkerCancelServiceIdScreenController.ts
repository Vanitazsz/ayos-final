import {
  cancelBooking,
  fetchBookingDetail,
  fetchCancellationReasons,
} from '../logic/WorkerCancelServiceIdScreenLogic';
import { useState, useMemo, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
type CancellationReason = {
  id: string;
  label: string;
  category: string;
  jobStages: JobStage[];
  requiresInput: boolean;
};

const jobStages = [
  { value: 'before_traveling' as const, label: 'Before traveling' },
  { value: 'after_arriving' as const, label: 'After arriving' },
  { value: 'after_inspecting' as const, label: 'After inspecting' },
];

type JobStage = 'before_traveling' | 'after_arriving' | 'after_inspecting';
export function useWorkerCancelServiceIdScreenController() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedStage, setSelectedStage] =
    useState<JobStage>('before_traveling');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] =
    useState<CancellationReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [cancellationReasons, setCancellationReasons] = useState<
    CancellationReason[]
  >([]);
  useEffect(() => {
    if (id)
      void fetchBookingDetail(id).then((result) => {
        if (!result.error)
          setBooking({
            customerName: result.data.user_profiles?.display_name ?? '',
          });
      });
    void fetchCancellationReasons().then((result) =>
      setCancellationReasons(
        result.data.map((row: any) => ({
          id: row.code,
          label: row.label,
          category: 'other',
          jobStages: ['before_traveling', 'after_arriving', 'after_inspecting'],
          requiresInput: false,
        })),
      ),
    );
  }, [id]);
  const filteredReasons = useMemo(() => {
    return cancellationReasons.filter((r) =>
      r.jobStages.includes(selectedStage),
    );
  }, [selectedStage]);
  const groupedReasons = useMemo(() => {
    const groups: Record<string, CancellationReason[]> = {
      customer: [],
      worker: [],
      job: [],
      policy: [],
      other: [],
    };
    filteredReasons.forEach((r) => {
      groups[r.category].push(r);
    });
    return groups;
  }, [filteredReasons]);
  const categoryLabels: Record<string, string> = {
    customer: 'Customer-related',
    worker: 'Worker-related',
    job: 'Job-related',
    policy: 'Policy & Safety',
    other: 'Other',
  };
  const categoryOrder = ['customer', 'worker', 'job', 'policy', 'other'];
  const filteredRecommendations = useMemo(() => {
    if (!customReason || customReason.length < 2) return [];
    const lower = customReason.toLowerCase();
    return cancellationReasons
      .filter(
        (r) =>
          r.label.toLowerCase().includes(lower) && r.id !== selectedReason?.id,
      )
      .slice(0, 5);
  }, [customReason, selectedReason]);
  const handleSelectReason = (reason: CancellationReason) => {
    setSelectedReason(reason);
    if (reason.requiresInput) {
      setCustomReason('');
    } else {
      setCustomReason(reason.label);
    }
    setShowDropdown(false);
  };
  const handleCustomReasonChange = (text: string) => {
    setCustomReason(text);
    setShowDropdown(text.length >= 2);
    if (text !== selectedReason?.label) {
      setSelectedReason(null);
    }
  };
  const handleSelectRecommendation = (reason: CancellationReason) => {
    setSelectedReason(reason);
    setCustomReason(reason.label);
    setShowDropdown(false);
  };
  const handleConfirm = () => {
    if ((selectedReason || customReason) && id) {
      void cancelBooking(
        id,
        customReason || selectedReason?.label || 'Cancelled',
      ).then(() => setShowConfirmation(true));
    }
  };
  const handleViewBookings = () => {
    setShowConfirmation(false);
    router.push('/(worker)/bookings?filter=Cancelled');
  };
  const canConfirm = selectedReason !== null || customReason.length > 0;
  return {
    id,
    selectedStage,
    setSelectedStage,
    expandedSection,
    setExpandedSection,
    selectedReason,
    setSelectedReason,
    customReason,
    setCustomReason,
    showDropdown,
    setShowDropdown,
    showConfirmation,
    showStageDropdown,
    setShowStageDropdown,
    booking,
    groupedReasons,
    categoryLabels,
    categoryOrder,
    filteredRecommendations,
    handleSelectReason,
    handleCustomReasonChange,
    handleSelectRecommendation,
    handleConfirm,
    handleViewBookings,
    canConfirm,
    router,
  };
}
