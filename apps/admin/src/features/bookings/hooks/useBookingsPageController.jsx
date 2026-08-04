import {
  cancelBookingAsAdmin,
  loadBookings,
  reassignBookingAsAdmin,
  subscribe,
} from '../logic/BookingsPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { BOOKING_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { usePagination } from '../../../hooks/usePagination';

export function useBookingsPageController() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [action, setAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [replacementWorker, setReplacementWorker] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirm = useCallback(
    () => setConfirm((s) => ({ ...s, isOpen: false })),
    [],
  );

  useEffect(() => {
    const refresh = async () => setBookings(await loadBookings());
    void refresh();
    return subscribe('bookings', refresh);
  }, []);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const matchesSearch =
          b.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.service.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          filterStatus === 'All' || b.status === filterStatus;
        return matchesSearch && matchesStatus;
      }),
    [bookings, searchTerm, filterStatus],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedBookings,
  } = usePagination(filteredBookings, 10);

  const todayStr = useMemo(() => new Date().toLocaleDateString(), []);

  const stats = useMemo(
    () => [
      {
        label: "Today's Bookings",
        value: bookings.filter((b) => b.date === todayStr).length,
        icon: <Calendar className="text-blue-500" />,
        bg: 'bg-blue-50',
      },
      {
        label: 'Pending / Unassigned',
        value: bookings.filter((b) => b.status === 'Pending').length,
        icon: <Clock className="text-yellow-500" />,
        bg: 'bg-yellow-50',
      },
      {
        label: 'Ongoing Services',
        value: bookings.filter((b) => b.status === 'Ongoing').length,
        icon: <PlayCircle className="text-indigo-500" />,
        bg: 'bg-indigo-50',
      },
      {
        label: 'Completed Today',
        value: bookings.filter(
          (b) => b.status === 'Completed' && b.date === todayStr,
        ).length,
        icon: <CheckCircle className="text-green-500" />,
        bg: 'bg-green-50',
      },
    ],
    [bookings, todayStr],
  );

  const getStatusColor = useCallback(
    (status) => badgeFor(BOOKING_STATUS_BADGE, status),
    [],
  );

  const toggleActionMenu = useCallback((id) => {
    setActionMenuOpenId((current) => (current === id ? null : id));
  }, []);

  const handleViewDetails = useCallback((booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const openAction = useCallback((type, booking) => {
    setAction({ type, booking });
    setActionReason('');
    setReplacementWorker(booking.candidates?.[0]?.id ?? '');
    setActionMenuOpenId(null);
  }, []);

  const executeAction = useCallback(async () => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    setSavingAction(true);
    try {
      if (action.type === 'cancel')
        await cancelBookingAsAdmin(action.booking.id, actionReason.trim());
      else
        await reassignBookingAsAdmin(
          action.booking.id,
          replacementWorker,
          actionReason.trim(),
        );
      setAction(null);
      setBookings(await loadBookings());
      setIsDrawerOpen(false);
    } catch (error) {
      toast.error('Action failed', error.message);
    } finally {
      setSavingAction(false);
    }
  }, [action, actionReason, replacementWorker, toast]);

  const submitAction = useCallback(() => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    const label =
      action.type === 'cancel' ? 'cancel this booking' : 'reassign this booking';
    setConfirm({
      isOpen: true,
      title: 'Confirm Action',
      message: `Confirm that you want to ${label}?`,
      onConfirm: executeAction,
    });
  }, [action, actionReason, replacementWorker, executeAction]);

  return useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      filterStatus,
      setFilterStatus,
      currentPage,
      setCurrentPage,
      selectedBooking,
      isDrawerOpen,
      setIsDrawerOpen,
      actionMenuOpenId,
      action,
      setAction,
      actionReason,
      setActionReason,
      replacementWorker,
      setReplacementWorker,
      savingAction,
      confirm,
      closeConfirm,
      filteredBookings,
      totalPages,
      paginatedBookings,
      stats,
      getStatusColor,
      toggleActionMenu,
      handleViewDetails,
      openAction,
      submitAction,
    }),
    [
      searchTerm,
      filterStatus,
      currentPage,
      selectedBooking,
      isDrawerOpen,
      actionMenuOpenId,
      action,
      actionReason,
      replacementWorker,
      savingAction,
      confirm,
      filteredBookings,
      totalPages,
      paginatedBookings,
      stats,
      getStatusColor,
      toggleActionMenu,
      handleViewDetails,
      openAction,
      submitAction,
      closeConfirm,
      setFilterStatus,
      setCurrentPage,
      setIsDrawerOpen,
      setAction,
      setActionReason,
      setReplacementWorker,
      toast,
    ],
  );
}
