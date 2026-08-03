import {
  cancelBookingAsAdmin,
  loadBookings,
  reassignBookingAsAdmin,
  subscribe,
} from '../logic/BookingsPageLogic';
import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

export function useBookingsPageController() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
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
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));
  const bookingsPerPage = 10;
  useEffect(() => {
    const refresh = async () => setBookings(await loadBookings());
    void refresh();
    return subscribe('bookings', refresh);
  }, []);
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * bookingsPerPage,
    currentPage * bookingsPerPage,
  );
  const stats = [
    {
      label: "Today's Bookings",
      value: bookings.filter((b) => b.date === new Date().toLocaleDateString()).length,
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
        (b) => b.status === 'Completed' && b.date === new Date().toLocaleDateString(),
      ).length,
      icon: <CheckCircle className="text-green-500" />,
      bg: 'bg-green-50',
    },
  ];
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Ongoing':
        return 'bg-indigo-100 text-indigo-800';
      case 'En Route':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const toggleActionMenu = (id) => {
    if (actionMenuOpenId === id) setActionMenuOpenId(null);
    else setActionMenuOpenId(id);
  };
  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  };
  const openAction = (type, booking) => {
    setAction({ type, booking });
    setActionReason('');
    setReplacementWorker(booking.candidates?.[0]?.id ?? '');
    setActionMenuOpenId(null);
  };
  const executeAction = async () => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    setSavingAction(true);
    try {
      if (action.type === 'cancel')
        await cancelBookingAsAdmin(action.booking.id, actionReason.trim());
      else await reassignBookingAsAdmin(action.booking.id, replacementWorker, actionReason.trim());
      setAction(null);
      setBookings(await loadBookings());
      setIsDrawerOpen(false);
    } catch (error) {
      toast.error('Action failed', error.message);
    } finally {
      setSavingAction(false);
    }
  };
  const submitAction = () => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    const label = action.type === 'cancel' ? 'cancel this booking' : 'reassign this booking';
    setConfirm({
      isOpen: true,
      title: 'Confirm Action',
      message: `Confirm that you want to ${label}?`,
      onConfirm: executeAction,
    });
  };
  return {
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
  };
}
