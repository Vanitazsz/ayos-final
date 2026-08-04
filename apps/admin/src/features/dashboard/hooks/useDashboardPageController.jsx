import {
  loadDashboard,
  loadNotifications,
  loadUsers,
  loadWorkers,
  reviewWorker,
  subscribe,
} from '../logic/DashboardPageLogic';
import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
export function useDashboardPageController() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const refresh = async () => {
    try {
      const [value, workers, users, notifications] = await Promise.all([
        loadDashboard(),
        loadWorkers(),
        loadUsers(),
        loadNotifications(),
      ]);
      setPendingWorkers(workers.filter((worker) => !worker.verified).slice(0, 4));
      setRecentUsers(users.slice(0, 3));
      setSystemNotifications(notifications.slice(0, 3));
      setMetrics(value.metrics);
      setActivities(value.activities);
      const months = new Map();
      value.payments.forEach((payment) => {
        const key = new Date(payment.successful_at).toLocaleString('en', { month: 'short' });
        const row = months.get(key) ?? { name: key, revenue: 0, profit: 0 };
        row.revenue += Number(payment.service_amount);
        row.profit += Number(payment.commission_amount);
        months.set(key, row);
      });
      setRevenueData([...months.values()]);
      const days = new Map();
      value.bookings.forEach((booking) => {
        const key = new Date(booking.created_at).toLocaleString('en', { weekday: 'short' });
        const row = days.get(key) ?? { name: key, completed: 0, cancelled: 0, pending: 0 };
        if (booking.status === 'COMPLETED') row.completed++;
        else if (booking.status === 'CANCELLED') row.cancelled++;
        else row.pending++;
        days.set(key, row);
      });
      setBookingsData([...days.values()]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    const stops = [
      'audit_logs',
      'payments',
      'bookings',
      'worker_verifications',
      'accounts',
      'user_profiles',
      'worker_profiles',
    ].map((table) => subscribe(table, refresh));
    return () => stops.forEach((stop) => stop());
  }, []);
  const handleReviewWorker = async (worker, decision) => {
    try {
      if (!worker.verificationId) throw new Error('No pending verification');
      await reviewWorker(
        worker.verificationId,
        decision,
        decision === 'REJECTED' ? 'Rejected by administrator' : null,
      );
      await refresh();
    } catch (error) {
      toast.error(decision === 'APPROVED' ? 'Approval failed' : 'Rejection failed', error.message);
    }
  };
  return {
    toast,
    isLoading,
    activities,
    metrics,
    revenueData,
    bookingsData,
    pendingWorkers,
    recentUsers,
    systemNotifications,
    handleReviewWorker,
  };
}
