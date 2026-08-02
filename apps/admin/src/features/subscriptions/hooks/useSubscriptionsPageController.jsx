import {
  activateSubscription,
  cancelSubscription,
  extendSubscription,
  loadSubscriptions,
  saveSubscriptionPlan,
} from '../logic/SubscriptionsPageLogic';
import { useState } from 'react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
export function useSubscriptionsPageController() {
  const toast = useToast();
  const { data: raw, isLoading, error, refresh } = useDataFetch(loadSubscriptions, []);
  useRealtime(['worker_recommendation_plans', 'worker_recommendation_subscriptions'], refresh);
  const data = raw ?? { plans: [], subscriptions: [], workers: [] };
  const [plan, setPlan] = useState(null);
  const [activation, setActivation] = useState(null);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));
  const [extendModal, setExtendModal] = useState({ isOpen: false, row: null });
  const [extendDays, setExtendDays] = useState('30');
  const savePlan = async () => {
    if (!plan?.name.trim() || Number(plan.duration_days) < 1) return;
    try {
      await saveSubscriptionPlan(plan);
      setPlan(null);
      await refresh();
    } catch (error) {
      toast.error('Save failed', error.message);
    }
  };
  const activate = async () => {
    if (!activation?.workerId || !activation?.planId) return;
    setConfirm({
      isOpen: true,
      title: 'Activate Subscription',
      message: 'Activate this worker recommendation subscription?',
      onConfirm: async () => {
        try {
          await activateSubscription(activation.workerId, activation.planId);
          setActivation(null);
          await refresh();
        } catch (error) {
          toast.error('Activation failed', error.message);
        }
      },
    });
  };
  const doExtend = async () => {
    const days = Number(extendDays);
    if (!Number.isInteger(days) || days < 1) return;
    setExtendModal((s) => ({ ...s, isOpen: false }));
    setConfirm({
      isOpen: true,
      title: 'Extend Subscription',
      message: `Extend this subscription by ${days} days?`,
      onConfirm: async () => {
        try {
          await extendSubscription(extendModal.row.id, days);
          await refresh();
        } catch (error) {
          toast.error('Extend failed', error.message);
        }
      },
    });
  };
  const cancel = async (row) => {
    setConfirm({
      isOpen: true,
      title: 'Cancel Subscription',
      message: 'Cancel this subscription now?',
      onConfirm: async () => {
        try {
          await cancelSubscription(row.id);
          await refresh();
        } catch (error) {
          toast.error('Cancel failed', error.message);
        }
      },
    });
  };
  return {
    isLoading,
    error,
    data,
    plan,
    setPlan,
    activation,
    setActivation,
    confirm,
    closeConfirm,
    extendModal,
    setExtendModal,
    extendDays,
    setExtendDays,
    savePlan,
    activate,
    doExtend,
    cancel,
  };
}
