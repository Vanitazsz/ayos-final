import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  Eye,
  User,
} from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';

import {
  cancelBookingAsAdmin,
  loadBookings,
  reassignBookingAsAdmin,
  subscribe,
} from '../../services/adminData';

const Bookings = () => {
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

  const submitAction = async () => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    const label = action.type === 'cancel' ? 'cancel this booking' : 'reassign this booking';
    if (!window.confirm(`Confirm that you want to ${label}?`)) return;
    setSavingAction(true);
    try {
      if (action.type === 'cancel')
        await cancelBookingAsAdmin(action.booking.id, actionReason.trim());
      else await reassignBookingAsAdmin(action.booking.id, replacementWorker, actionReason.trim());
      setAction(null);
      setBookings(await loadBookings());
      setIsDrawerOpen(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
          <p className="text-gray-500 mt-1">
            Track and manage all service bookings across the platform
          </p>
        </div>
        <button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          + Create Booking
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center"
          >
            <div className={`p-4 rounded-lg ${stat.bg} mr-4`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by ID, customer, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Booking ID & Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer & Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedBookings.length > 0 ? (
              paginatedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.id}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <Calendar size={12} className="mr-1" /> {booking.date}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <Clock size={12} className="mr-1" /> {booking.schedule} ({booking.duration})
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{booking.service}</div>
                    <div className="text-xs text-gray-500">{booking.category}</div>
                    <div
                      className="text-xs text-gray-500 mt-1 truncate max-w-[150px]"
                      title={booking.address}
                    >
                      <MapPin size={12} className="inline mr-1" /> {booking.address}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <User size={14} className="mr-1 text-gray-400" /> {booking.customer}
                    </div>
                    <div
                      className={`text-xs mt-1 font-medium ${!booking.worker ? 'text-red-500' : 'text-blue-600'}`}
                    >
                      Worker: {booking.worker}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${booking.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">{booking.payment}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() => toggleActionMenu(booking.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {actionMenuOpenId === booking.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-10 py-1">
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <Eye size={16} className="mr-2 text-gray-400" /> View Details
                        </button>
                        <button
                          onClick={() => openAction('reassign', booking)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <User size={16} className="mr-2 text-gray-400" /> Reassign Worker
                        </button>
                        <button className="flex items-center w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 text-left">
                          <PlayCircle size={16} className="mr-2 text-yellow-500" /> Resolve Issue
                        </button>
                        <button
                          onClick={() => openAction('cancel', booking)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                        >
                          <XCircle size={16} className="mr-2 text-red-500" /> Cancel Booking
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Calendar size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
                    <p className="text-gray-500 mt-1">
                      Adjust your search to find what you're looking for.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredBookings.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Booking Details Drawer with Timeline */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Booking ${selectedBooking?.id}`}
        width="w-[500px]"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedBooking.service}</h3>
                  <p className="text-sm text-gray-500">{selectedBooking.category}</p>
                </div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}
                >
                  {selectedBooking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-gray-500">Date & Time</p>
                  <p className="font-medium text-gray-900">
                    {selectedBooking.date} • {selectedBooking.schedule}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Price</p>
                  <p className="font-medium text-gray-900">${selectedBooking.price.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Service Address</p>
                  <p className="font-medium text-gray-900">{selectedBooking.address}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                People Involved
              </h4>
              <div className="flex justify-between gap-4">
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Customer</p>
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold mr-2">
                      {selectedBooking.customer.charAt(0)}
                    </div>
                    <span className="font-medium text-sm">{selectedBooking.customer}</span>
                  </div>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Assigned Worker</p>
                  <div className="flex items-center">
                    {selectedBooking.worker ? (
                      <>
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold mr-2">
                          {selectedBooking.worker.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{selectedBooking.worker}</span>
                      </>
                    ) : (
                      <span className="text-sm text-red-500 font-medium">Not Assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Booking event timeline */}
            <div className="border-t border-gray-200 pt-6 pb-20">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
                Booking Timeline
              </h4>
              <div className="relative border-l border-gray-200 ml-3 space-y-8">
                {selectedBooking.events?.map((event, index) => (
                  <div key={`${event.created_at}-${index}`} className="relative pl-6">
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                    <p className="text-sm font-medium text-gray-900">
                      {event.to_status.replaceAll('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                      {event.reason ? ` • ${event.reason}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedBooking.cancellation && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
                <h4 className="font-semibold text-red-800">Cancellation</h4>
                <p className="mt-1 text-red-700">{selectedBooking.cancellation.reason}</p>
                <p className="mt-2 text-red-700">
                  Refund: ₱
                  {Number(selectedBooking.cancellation.refund_amount ?? 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  · Fee: ₱
                  {Number(selectedBooking.cancellation.fee_amount ?? 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                {selectedBooking.refund && (
                  <p className="mt-1 text-red-700">
                    Refund status: {selectedBooking.refund.status} — {selectedBooking.refund.reason}
                  </p>
                )}
              </div>
            )}

            {/* Fixed footer in drawer */}
            <div className="fixed bottom-0 right-0 w-[500px] bg-white border-t border-gray-200 p-4 flex justify-end space-x-3 shadow-lg">
              {!['Completed', 'Cancelled'].includes(selectedBooking.status) && (
                <>
                  <button
                    onClick={() => openAction('reassign', selectedBooking)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700"
                  >
                    Reassign Worker
                  </button>
                  <button
                    onClick={() => openAction('cancel', selectedBooking)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
      <Modal
        isOpen={Boolean(action)}
        onClose={() => !savingAction && setAction(null)}
        title={action?.type === 'cancel' ? 'Cancel Booking' : 'Reassign Worker'}
      >
        {action && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Booking {action.booking.id}</p>
            {action.type === 'reassign' && (
              <div>
                <label className="mb-1 block text-sm font-medium">Matched worker</label>
                <select
                  value={replacementWorker}
                  onChange={(event) => setReplacementWorker(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Select a worker</option>
                  {action.booking.candidates?.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · score {candidate.score.toFixed(1)}
                    </option>
                  ))}
                </select>
                {!action.booking.candidates?.length && (
                  <p className="mt-1 text-xs text-red-600">
                    No eligible match candidates are available.
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Admin reason</label>
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                maxLength={1000}
                className="min-h-24 w-full rounded-lg border border-gray-300 p-3"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                disabled={savingAction}
                onClick={() => setAction(null)}
                className="rounded-lg border px-4 py-2"
              >
                Close
              </button>
              <button
                disabled={
                  savingAction ||
                  actionReason.trim().length < 3 ||
                  (action.type === 'reassign' && !replacementWorker)
                }
                onClick={() => void submitAction()}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {savingAction ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Bookings;
