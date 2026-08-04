import { loadAuditLogs } from '../logic/AuditLogsPageLogic';
import { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useActiveSessionCount } from '../../../hooks/useActiveSessionCount';
import { usePagination } from '../../../hooks/usePagination';

export function useAuditLogsPageController() {
  const { data: logs, isLoading, error, refresh } = useDataFetch(loadAuditLogs, []);
  useRealtime('audit_logs', refresh);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('All');
  const activeSessions = useActiveSessionCount();

  const safeLogs = logs ?? [];
  const filteredLogs = safeLogs.filter((l) => {
    const matchesSearch =
      l.admin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.ip.includes(searchTerm);
    const matchesModule = filterModule === 'All' || l.module === filterModule;
    return matchesSearch && matchesModule;
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedLogs,
  } = usePagination(filteredLogs, 12);
  const stats = [
    {
      label: 'Recent Activities',
      value: safeLogs.length,
      icon: <ShieldAlert className="text-blue-500" />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Failed Actions',
      value: safeLogs.filter((log) => log.status === 'Failed').length,
      icon: <XCircle className="text-red-500" />,
      bg: 'bg-red-50',
    },
    {
      label: 'Critical Actions',
      value: safeLogs.filter(
        (log) => String(log.metadata?.severity ?? '').toUpperCase() === 'CRITICAL',
      ).length,
      icon: <AlertTriangle className="text-orange-500" />,
      bg: 'bg-orange-50',
    },
    {
      label: 'Active Sessions',
      value: activeSessions,
      icon: <CheckCircle className="text-green-500" />,
      bg: 'bg-green-50',
    },
  ];
  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterModule,
    setFilterModule,
    currentPage,
    setCurrentPage,
    filteredLogs,
    totalPages,
    paginatedLogs,
    stats,
  };
}
