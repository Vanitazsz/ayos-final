import {
  loadCustomerVerifications,
  loadUsers,
  reviewCustomerVerification,
  setAccountStatus,
  subscribe,
  updateUser,
} from '../logic/UsersPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';

export function useUsersPageController() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [loadError, setLoadError] = useState('');
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoadError('');
    try {
      const customerRows = await loadUsers();
      setUsers(customerRows);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load customer accounts.',
      );
    }
    try {
      setVerifications(await loadCustomerVerifications());
    } catch (error) {
      setVerifications([]);
      setLoadError(
        (current) =>
          current ||
          (error instanceof Error
            ? error.message
            : 'Unable to load customer verifications.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const stops = [
      subscribe('accounts', refresh),
      subscribe('user_profiles', refresh),
      subscribe('customer_verifications', refresh),
    ];
    const fallbackRefresh = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearInterval(fallbackRefresh);
      stops.forEach((stop) => stop());
    };
  }, [refresh]);

  const decide = useCallback(
    (decision) => {
      if (!selectedVerification) return;
      const label = decision === 'approved' ? 'Approve' : 'Reject';
      setConfirm({
        isOpen: true,
        title: `${label} Verification`,
        message: `${label} this identity verification?`,
        onConfirm: async () => {
          setReviewing(true);
          try {
            await reviewCustomerVerification(
              selectedVerification.id,
              decision,
              reviewNotes,
            );
            setSelectedVerification(null);
            setReviewNotes('');
            await refresh();
          } catch (error) {
            toast.error(
              'Verification failed',
              error instanceof Error
                ? error.message
                : 'Unable to complete verification.',
            );
          } finally {
            setReviewing(false);
          }
        },
      });
    },
    [selectedVerification, reviewNotes, refresh, toast],
  );

  const toggleActionMenu = useCallback(
    (id) => {
      setActionMenuOpenId((current) => (current === id ? null : id));
    },
    [],
  );

  const handleViewProfile = useCallback((user) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const handleEditUser = useCallback((user) => {
    setEditUser({ ...user });
    setIsEditModalOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const handleSaveUser = useCallback(
    async (event) => {
      event.preventDefault();
      if (!editUser) return;
      setIsSavingUser(true);
      try {
        await updateUser(editUser.id, editUser.name, editUser.phone);
        await refresh();
        setIsEditModalOpen(false);
        toast.success('User updated', `${editUser.name}'s profile was saved.`);
      } catch (error) {
        toast.error(
          'Update failed',
          error instanceof Error ? error.message : 'Unable to update user.',
        );
      } finally {
        setIsSavingUser(false);
      }
    },
    [editUser, refresh, toast],
  );

  const handleToggleStatus = useCallback(
    async (user) => {
      const nextStatus = user.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
      setActionLoadingId(`${user.id}:status`);
      setActionMenuOpenId(null);
      try {
        await setAccountStatus(user.id, nextStatus);
        await refresh();
        toast.success(
          nextStatus === 'SUSPENDED' ? 'User suspended' : 'User reactivated',
          `${user.name} is now ${nextStatus === 'SUSPENDED' ? 'suspended' : 'active'}.`,
        );
      } catch (error) {
        toast.error(
          'Status update failed',
          error instanceof Error ? error.message : 'Unable to update status.',
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [refresh, toast],
  );

  const handleDelete = useCallback((user) => {
    setActionMenuOpenId(null);
    setDeleteTarget(user);
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.id.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [users, searchQuery],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: currentUsers,
  } = usePagination(filteredUsers, 10);

  const getStatusBadge = useCallback((status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }, []);

  return useMemo(
    () => ({
      isLoading,
      searchQuery,
      setSearchQuery,
      currentPage,
      setCurrentPage,
      actionMenuOpenId,
      activeTab,
      setActiveTab,
      verifications,
      selectedVerification,
      setSelectedVerification,
      reviewNotes,
      setReviewNotes,
      reviewing,
      loadError,
      confirm,
      closeConfirm,
      selectedUser,
      isProfileModalOpen,
      setIsProfileModalOpen,
      editUser,
      setEditUser,
      isEditModalOpen,
      setIsEditModalOpen,
      isSavingUser,
      actionLoadingId,
      deleteTarget,
      setDeleteTarget,
      toast,
      itemsPerPage: 10,
      refresh,
      decide,
      toggleActionMenu,
      handleViewProfile,
      handleEditUser,
      handleSaveUser,
      handleToggleStatus,
      handleDelete,
      filteredUsers,
      totalPages,
      currentUsers,
      getStatusBadge,
    }),
    [
      isLoading,
      searchQuery,
      currentPage,
      actionMenuOpenId,
      activeTab,
      verifications,
      selectedVerification,
      reviewNotes,
      reviewing,
      loadError,
      confirm,
      selectedUser,
      isProfileModalOpen,
      editUser,
      isEditModalOpen,
      isSavingUser,
      actionLoadingId,
      deleteTarget,
      refresh,
      decide,
      toggleActionMenu,
      handleViewProfile,
      handleEditUser,
      handleSaveUser,
      handleToggleStatus,
      handleDelete,
      filteredUsers,
      totalPages,
      currentUsers,
      getStatusBadge,
      closeConfirm,
      setCurrentPage,
      setSelectedVerification,
      setReviewNotes,
      setIsProfileModalOpen,
      setEditUser,
      setIsEditModalOpen,
      setDeleteTarget,
      toast,
    ],
  );
}
