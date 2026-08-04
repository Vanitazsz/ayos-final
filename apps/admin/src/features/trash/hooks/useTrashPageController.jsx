import {
  TRASH_TABS,
  loadTrash,
  permanentlyDeleteTrash,
  restoreTrash,
} from '../logic/TrashPageLogic';
import { useState } from 'react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';
const tabs = TRASH_TABS;
export function useTrashPageController() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('Users');
  const { data: raw, isLoading, error, refresh } = useDataFetch(loadTrash, []);
  useRealtime('trash_entries', refresh);
  const items = raw ?? Object.fromEntries(tabs.map((tab) => [tab, []]));
  const [searchTerm, setSearchTerm] = useState('');
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const currentItems = items[activeTab];
  const filteredItems = currentItems.filter(
    (item) =>
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedItems,
  } = usePagination(filteredItems, 10);
  const handleRestore = async (id) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Item',
      message: 'Restore this item?',
      onConfirm: async () => {
        try {
          await restoreTrash(id);
          await refresh();
        } catch (error) {
          toast.error('Restore failed', error.message);
        }
      },
    });
  };
  const handlePermanentDelete = async (id) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete',
      message: 'Permanently delete this item? This CANNOT be undone.',
      onConfirm: async () => {
        try {
          await permanentlyDeleteTrash(id);
          await refresh();
        } catch (error) {
          toast.error('Delete failed', error.message);
        }
      },
    });
  };
  const handleRestoreAll = async () => {
    setConfirm({
      isOpen: true,
      title: 'Restore All',
      message: `Restore all ${filteredItems.length} items?`,
      onConfirm: async () => {
        try {
          for (const item of filteredItems) await restoreTrash(item.id);
          await refresh();
        } catch (error) {
          toast.error('Restore failed', error.message);
        }
      },
    });
  };
  const handleEmptyTrash = async () => {
    setConfirm({
      isOpen: true,
      title: 'Empty Trash',
      message: `Permanently delete all ${filteredItems.length} items in ${activeTab} trash? This CANNOT be undone.`,
      onConfirm: async () => {
        try {
          for (const item of filteredItems) await permanentlyDeleteTrash(item.id);
          await refresh();
        } catch (error) {
          toast.error('Delete failed', error.message);
        }
      },
    });
  };
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));
  return {
    activeTab,
    setActiveTab,
    isLoading,
    error,
    items,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    confirm,
    filteredItems,
    totalPages,
    paginatedItems,
    handleRestore,
    handlePermanentDelete,
    handleRestoreAll,
    handleEmptyTrash,
    closeConfirm,
  };
}
