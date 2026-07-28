import React, { useEffect, useState } from 'react';
import { 
  Search, Filter, Plus, Edit2, Trash2, 
  Copy, Layers, ArrowUpRight, ArrowDownRight,
  Wrench, Box, CheckCircle, XCircle, Grid, ToggleLeft, ToggleRight
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';

import { loadCatalog, saveCategory, saveService, subscribe } from '../../services/adminData';

const Services = () => {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentService, setCurrentService] = useState(null);
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'categories'
  const [categoriesData, setCategoriesData] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);

  const servicesPerPage = 8;
  const refresh=async()=>{const value=await loadCatalog();setServices(value.services);setCategoriesData(value.categories)};
  useEffect(()=>{void refresh();const stopServices=subscribe('services',refresh);const stopCategories=subscribe('service_categories',refresh);return()=>{stopServices();stopCategories()}},[]);

  const categories = ['All', ...new Set(services.map(s => s.category))];

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredServices.length / servicesPerPage);
  const paginatedServices = filteredServices.slice((currentPage - 1) * servicesPerPage, currentPage * servicesPerPage);

  const stats = [
    { label: 'Total Services', value: services.length, icon: <Layers className="text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'Active Services', value: services.filter(s => s.status === 'Active').length, icon: <CheckCircle className="text-green-500" />, bg: 'bg-green-50' },
    { label: 'Most Booked', value: 'Deep Cleaning', icon: <ArrowUpRight className="text-indigo-500" />, bg: 'bg-indigo-50' },
    { label: 'Hidden/Inactive', value: services.filter(s => s.status === 'Inactive').length, icon: <XCircle className="text-gray-500" />, bg: 'bg-gray-50' },
  ];

  const handleOpenAddModal = () => {
    setModalMode('add');
    setCurrentService({ name: '', category: '', price: '', duration: '', status: 'Active' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setModalMode('edit');
    setCurrentService({ ...service });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this service?')) {
      const service=services.find(item=>item.id===id);try{await saveService({...service,status:'Inactive'},categoriesData);await refresh()}catch(error){alert(error.message)}
    }
  };

  const handleOpenAddCategoryModal = () => {
    setModalMode('add');
    setCurrentCategory({ name: '', status: 'Enabled' });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategoryModal = (cat) => {
    setModalMode('edit');
    setCurrentCategory({ ...cat });
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (id) => {
    if(window.confirm('Are you sure you want to delete this category? Note: This action may affect services.')) {
      const category=categoriesData.find(item=>item.id===id);try{await saveCategory({...category,status:'Disabled'});await refresh()}catch(error){alert(error.message)}
    }
  };

  const toggleCategoryStatus = async (id) => {
    const category=categoriesData.find(item=>item.id===id);try{await saveCategory({...category,status:category.status==='Enabled'?'Disabled':'Enabled'});await refresh()}catch(error){alert(error.message)}
  };

  const handleDuplicate = async (service) => {
    try{await saveService({...service,id:null,name:`${service.name} Copy`},categoriesData);await refresh()}catch(error){alert(error.message)}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try{await saveService(currentService,categoriesData);await refresh();setIsModalOpen(false)}catch(error){alert(error.message)}
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try{await saveCategory(currentCategory);await refresh();setIsCategoryModalOpen(false)}catch(error){alert(error.message)}
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Catalog</h1>
          <p className="text-gray-500 mt-1">Manage the services offered by workers on the platform</p>
        </div>
        <button 
          onClick={activeTab === 'services' ? handleOpenAddModal : handleOpenAddCategoryModal}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={18} className="mr-2" /> Add {activeTab === 'services' ? 'Service' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button 
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'services' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('services')}
        >
          Manage Services
        </button>
        <button 
          className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('categories')}
        >
          Manage Categories
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
            <div className={`p-4 rounded-lg ${stat.bg} mr-4`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900">{stat.value}</h3>
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
            placeholder="Search services by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'services' ? (
        <>
          {/* Table */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popularity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedServices.length > 0 ? paginatedServices.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Wrench size={20} className="text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{service.name}</div>
                      <div className="text-xs text-gray-500">{service.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                    {service.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-medium">Starts at ${service.price}</div>
                  <div className="text-xs text-gray-500">Est. {service.duration}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.bookings} Bookings</div>
                  <div className="text-xs text-gray-500">{service.workers} Active Workers</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {service.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => handleDuplicate(service)}
                      className="text-gray-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenEditModal(service)}
                      className="text-gray-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(service.id)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Box size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No services found</h3>
                    <p className="text-gray-500 mt-1">Add a new service to get started.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredServices.length > 0 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}
      </>
      ) : (
        <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Services</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoriesData.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <Grid size={20} className="text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                        <div className="text-xs text-gray-500">{cat.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">{cat.servicesCount} Services</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleCategoryStatus(cat.id)}
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        cat.status === 'Enabled' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {cat.status === 'Enabled' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      <span>{cat.status}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenEditCategoryModal(cat)}
                        className="text-gray-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'add' ? 'Add New Service' : 'Edit Service'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <input 
              type="text" 
              required
              value={currentService?.name || ''}
              onChange={(e) => setCurrentService({...currentService, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Toilet Repair"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                required
                value={currentService?.category || ''}
                onChange={(e) => setCurrentService({...currentService, category: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={currentService?.status || 'Active'}
                onChange={(e) => setCurrentService({...currentService, status: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Price ($)</label>
              <input 
                type="number" 
                required
                min="0"
                value={currentService?.price || ''}
                onChange={(e) => setCurrentService({...currentService, price: Number(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration</label>
              <input 
                type="text" 
                required
                value={currentService?.duration || ''}
                onChange={(e) => setCurrentService({...currentService, duration: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 2 hours"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea 
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of what this service entails..."
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
            >
              {modalMode === 'add' ? 'Create Service' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        title={modalMode === 'add' ? 'Add New Category' : 'Edit Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input 
              type="text" 
              required
              value={currentCategory?.name || ''}
              onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Landscaping"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={currentCategory?.status || 'Enabled'}
              onChange={(e) => setCurrentCategory({...currentCategory, status: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200">
            <button 
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
            >
              {modalMode === 'add' ? 'Create Category' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Services;
