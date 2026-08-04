import {
  loadCatalog,
  loadMostBookedService,
  saveCategory,
  saveService,
  subscribe,
} from '../logic/ServicesPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, ArrowUpRight, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';

export function useServicesPageController() {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentService, setCurrentService] = useState(null);
  const [activeTab, setActiveTab] = useState('services');
  const [categoriesData, setCategoriesData] = useState([]);
  const toast = useToast();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
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
  const [mostBooked, setMostBooked] = useState(null);

  const refresh = useCallback(async () => {
    const [value, booked] = await Promise.all([
      loadCatalog(),
      loadMostBookedService(),
    ]);
    setServices(value.services);
    setCategoriesData(value.categories);
    setMostBooked(booked);
  }, []);

  useEffect(() => {
    void refresh();
    const stopServices = subscribe('services', refresh);
    const stopCategories = subscribe('service_categories', refresh);
    return () => {
      stopServices();
      stopCategories();
    };
  }, [refresh]);

  const categories = useMemo(
    () => ['All', ...new Set(services.map((s) => s.category))],
    [services],
  );

  const filteredServices = useMemo(
    () =>
      services.filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          filterCategory === 'All' || s.category === filterCategory;
        return matchesSearch && matchesCategory;
      }),
    [services, searchTerm, filterCategory],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedServices,
  } = usePagination(filteredServices, 8);

  const stats = useMemo(
    () => [
      {
        label: 'Total Services',
        value: services.length,
        icon: <Layers className="text-blue-500" />,
        bg: 'bg-blue-50',
      },
      {
        label: 'Active Services',
        value: services.filter((s) => s.status === 'Active').length,
        icon: <CheckCircle className="text-green-500" />,
        bg: 'bg-green-50',
      },
      {
        label: 'Most Booked',
        value: mostBooked ?? '—',
        icon: <ArrowUpRight className="text-indigo-500" />,
        bg: 'bg-indigo-50',
      },
      {
        label: 'Hidden/Inactive',
        value: services.filter((s) => s.status === 'Inactive').length,
        icon: <XCircle className="text-gray-500" />,
        bg: 'bg-gray-50',
      },
    ],
    [services, mostBooked],
  );

  const handleOpenAddModal = useCallback(() => {
    setModalMode('add');
    setCurrentService({
      name: '',
      category: '',
      price: '',
      duration: '',
      status: 'Active',
    });
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((service) => {
    setModalMode('edit');
    setCurrentService({ ...service });
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id) => {
      setConfirm({
        isOpen: true,
        title: 'Delete Service',
        message: 'Are you sure you want to delete this service?',
        onConfirm: async () => {
          const service = services.find((item) => item.id === id);
          try {
            await saveService(
              { ...service, status: 'Inactive' },
              categoriesData,
            );
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [services, categoriesData, refresh, toast],
  );

  const handleOpenAddCategoryModal = useCallback(() => {
    setModalMode('add');
    setCurrentCategory({ name: '', status: 'Enabled' });
    setIsCategoryModalOpen(true);
  }, []);

  const handleOpenEditCategoryModal = useCallback((cat) => {
    setModalMode('edit');
    setCurrentCategory({ ...cat });
    setIsCategoryModalOpen(true);
  }, []);

  const handleDeleteCategory = useCallback(
    (id) => {
      setConfirm({
        isOpen: true,
        title: 'Delete Category',
        message:
          'Are you sure you want to delete this category? Note: This action may affect services.',
        onConfirm: async () => {
          const category = categoriesData.find((item) => item.id === id);
          try {
            await saveCategory({ ...category, status: 'Disabled' });
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [categoriesData, refresh, toast],
  );

  const toggleCategoryStatus = useCallback(
    async (id) => {
      const category = categoriesData.find((item) => item.id === id);
      try {
        await saveCategory({
          ...category,
          status: category.status === 'Enabled' ? 'Disabled' : 'Enabled',
        });
        await refresh();
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [categoriesData, refresh, toast],
  );

  const handleDuplicate = useCallback(
    async (service) => {
      try {
        await saveService(
          { ...service, id: null, name: `${service.name} Copy` },
          categoriesData,
        );
        await refresh();
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [categoriesData, refresh, toast],
  );

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        await saveService(currentService, categoriesData);
        await refresh();
        setIsModalOpen(false);
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [currentService, categoriesData, refresh, toast],
  );

  const handleSaveCategory = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        await saveCategory(currentCategory);
        await refresh();
        setIsCategoryModalOpen(false);
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [currentCategory, refresh, toast],
  );

  return useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      filterCategory,
      setFilterCategory,
      currentPage,
      setCurrentPage,
      isModalOpen,
      setIsModalOpen,
      modalMode,
      currentService,
      setCurrentService,
      activeTab,
      setActiveTab,
      categoriesData,
      isCategoryModalOpen,
      setIsCategoryModalOpen,
      currentCategory,
      setCurrentCategory,
      confirm,
      closeConfirm,
      categories,
      filteredServices,
      totalPages,
      paginatedServices,
      stats,
      handleOpenAddModal,
      handleOpenEditModal,
      handleDelete,
      handleOpenAddCategoryModal,
      handleOpenEditCategoryModal,
      handleDeleteCategory,
      toggleCategoryStatus,
      handleDuplicate,
      handleSave,
      handleSaveCategory,
    }),
    [
      searchTerm,
      filterCategory,
      currentPage,
      isModalOpen,
      modalMode,
      currentService,
      activeTab,
      categoriesData,
      isCategoryModalOpen,
      currentCategory,
      confirm,
      categories,
      filteredServices,
      totalPages,
      paginatedServices,
      stats,
      handleOpenAddModal,
      handleOpenEditModal,
      handleDelete,
      handleOpenAddCategoryModal,
      handleOpenEditCategoryModal,
      handleDeleteCategory,
      toggleCategoryStatus,
      handleDuplicate,
      handleSave,
      handleSaveCategory,
      closeConfirm,
      setSearchTerm,
      setFilterCategory,
      setCurrentPage,
      setIsModalOpen,
      setCurrentService,
      setActiveTab,
      setIsCategoryModalOpen,
      setCurrentCategory,
      toast,
    ],
  );
}
