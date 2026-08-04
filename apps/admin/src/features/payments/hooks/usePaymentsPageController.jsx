import { loadPayments } from '../logic/PaymentsPageLogic';
import { useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, ArrowDownRight } from 'lucide-react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { money } from '../../../services/adminShared';
import { useRealtime } from '../../../hooks/useRealtime';
import { PAYMENT_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { usePagination } from '../../../hooks/usePagination';

export function usePaymentsPageController() {
  const { data: transactions, isLoading, error, refresh } = useDataFetch(loadPayments, []);
  useRealtime('payments', refresh);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  const filteredTxns = transactions.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.worker.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || t.type === filterType;

    let matchesTab = true;
    if (activeTab === 'refunds') matchesTab = t.type === 'Refund';
    if (activeTab === 'cash') matchesTab = t.method === 'Cash' || t.method === 'Bank Transfer'; // Simulating offline payments

    return matchesSearch && matchesType && matchesTab;
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedTxns,
  } = usePagination(filteredTxns, 10);
  const stats = [
    {
      label: 'Total Revenue',
      value: money(
        transactions.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0),
      ),
      trend: 'Live',
      icon: <DollarSign className="text-green-500" />,
      bg: 'bg-green-50',
      positive: true,
    },
    {
      label: 'Platform Commission',
      value: money(
        transactions.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + t.fee, 0),
      ),
      trend: 'Live',
      icon: <TrendingUp className="text-blue-500" />,
      bg: 'bg-blue-50',
      positive: true,
    },
    {
      label: 'Pending Payments',
      value: money(
        transactions.filter((t) => t.status === 'Pending').reduce((sum, t) => sum + t.amount, 0),
      ),
      trend: 'Live',
      icon: <CreditCard className="text-yellow-500" />,
      bg: 'bg-yellow-50',
      positive: false,
    },
    {
      label: 'Failed Payments',
      value: transactions.filter((t) => t.status === 'Failed').length,
      trend: 'Live',
      icon: <ArrowDownRight className="text-red-500" />,
      bg: 'bg-red-50',
      positive: false,
    },
  ];
  const getStatusColor = (status) => badgeFor(PAYMENT_STATUS_BADGE, status);
  const handleViewDetails = (txn) => {
    setSelectedTxn(txn);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  };
  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    currentPage,
    setCurrentPage,
    selectedTxn,
    isDrawerOpen,
    setIsDrawerOpen,
    actionMenuOpenId,
    setActionMenuOpenId,
    activeTab,
    setActiveTab,
    filteredTxns,
    totalPages,
    paginatedTxns,
    stats,
    getStatusColor,
    handleViewDetails,
  };
}
