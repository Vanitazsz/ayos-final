import {
  loadWorkers,
  reviewWorker,
  setAccountStatus,
  setWorkerAvailability,
} from '../logic/WorkersPageLogic';
import { useEffect, useState } from 'react';
import { UserCheck, UserX, AlertCircle, Briefcase } from 'lucide-react';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';

export function useWorkersPageController() {
  const toast = useToast();
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [workerToReview, setWorkerToReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const workersPerPage = 10;
  const refresh = async () => {
    try {
      setLoadError('');
      setWorkers(await loadWorkers());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load workers.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  useRealtime(['worker_profiles', 'worker_verifications', 'worker_skills', 'accounts'], refresh);
  const needsReview = (worker) =>
    Boolean(worker.verificationId) && worker.verificationStatus !== 'APPROVED';
  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || w.status === filterStatus;
    const matchesTab = activeTab === 'all' || (activeTab === 'review' && needsReview(w));
    return matchesSearch && matchesStatus && matchesTab;
  });
  const totalPages = Math.ceil(filteredWorkers.length / workersPerPage);
  const paginatedWorkers = filteredWorkers.slice(
    (currentPage - 1) * workersPerPage,
    currentPage * workersPerPage,
  );
  const stats = [
    {
      label: 'Total Workers',
      value: workers.length,
      icon: <Briefcase className="text-blue-500" />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Workers',
      value: workers.filter((w) => w.status === 'Active').length,
      icon: <UserCheck className="text-green-500" />,
      bg: 'bg-green-50',
    },
    {
      label: 'Pending Verification',
      value: workers.filter(needsReview).length,
      icon: <AlertCircle className="text-yellow-500" />,
      bg: 'bg-yellow-50',
    },
    {
      label: 'Suspended',
      value: workers.filter((w) => w.status === 'Suspended').length,
      icon: <UserX className="text-red-500" />,
      bg: 'bg-red-50',
    },
  ];
  const toggleActionMenu = (id) => {
    if (actionMenuOpenId === id) setActionMenuOpenId(null);
    else setActionMenuOpenId(id);
  };
  const handleViewDetails = (worker) => {
    setSelectedWorker(worker);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  };
  const handleDeleteClick = (worker) => {
    setWorkerToDelete(worker);
    setActionMenuOpenId(null);
  };
  const toggleStatus = async (worker) => {
    try {
      await setAccountStatus(worker.id, worker.status === 'Active' ? 'SUSPENDED' : 'ACTIVE');
      await refresh();
    } catch (error) {
      toast.error('Status update failed', error.message);
    } finally {
      setActionMenuOpenId(null);
    }
  };
  const approveWorker = async (worker) => {
    try {
      if (!worker.verificationId) throw new Error('No pending verification');
      await reviewWorker(worker.verificationId, 'APPROVED', null);
      await refresh();
    } catch (error) {
      toast.error('Approval failed', error.message);
    } finally {
      setActionMenuOpenId(null);
    }
  };
  const openRemarksModal = (worker) => {
    setWorkerToReview(worker);
    setRemarks('');
    setIsRemarksModalOpen(true);
    setActionMenuOpenId(null);
  };
  const submitRemarks = async () => {
    try {
      if (!workerToReview.verificationId) throw new Error('No pending verification');
      await reviewWorker(workerToReview.verificationId, 'NEEDS_DOCUMENTS', remarks);
      await refresh();
      setIsRemarksModalOpen(false);
    } catch (error) {
      toast.error('Document request failed', error.message);
    }
  };
  const toggleAvailability = async (worker) => {
    try {
      await setWorkerAvailability(worker.id, worker.availability !== 'Online');
      await refresh();
    } catch (error) {
      toast.error('Availability update failed', error.message);
    } finally {
      setActionMenuOpenId(null);
    }
  };
  return {
    workers,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    selectedWorker,
    isDrawerOpen,
    setIsDrawerOpen,
    workerToDelete,
    setWorkerToDelete,
    actionMenuOpenId,
    activeTab,
    setActiveTab,
    isRemarksModalOpen,
    setIsRemarksModalOpen,
    remarks,
    setRemarks,
    workerToReview,
    isLoading,
    loadError,
    refresh,
    needsReview,
    filteredWorkers,
    totalPages,
    paginatedWorkers,
    stats,
    toggleActionMenu,
    handleViewDetails,
    handleDeleteClick,
    toggleStatus,
    approveWorker,
    openRemarksModal,
    submitRemarks,
    toggleAvailability,
  };
}
