import React, { useEffect, useState } from 'react';
import { 
  Search, Filter, MoreVertical, CheckCircle, XCircle, 
  Eye, Edit, Trash2, UserCheck, UserX, AlertCircle,
  Briefcase, Star, MapPin, Phone, Mail, Calendar, Clock
} from 'lucide-react';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';

import { deleteAccount, loadWorkers, reviewWorker, setAccountStatus, setWorkerAvailability, subscribe } from '../../services/adminData';

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [workerToReview, setWorkerToReview] = useState(null);

  const workersPerPage = 10;
  const refresh=async()=>setWorkers(await loadWorkers());
  useEffect(()=>{void refresh();return subscribe('worker_profiles',refresh)},[]);

  // Filter workers
  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || w.status === filterStatus;
    const matchesTab = activeTab === 'all' || (activeTab === 'review' && !w.verified);
    return matchesSearch && matchesStatus && matchesTab;
  });

  const totalPages = Math.ceil(filteredWorkers.length / workersPerPage);
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * workersPerPage, currentPage * workersPerPage);

  const stats = [
    { label: 'Total Workers', value: workers.length, icon: <Briefcase className="text-blue-500" />, bg: 'bg-blue-50' },
    { label: 'Active Workers', value: workers.filter(w => w.status === 'Active').length, icon: <UserCheck className="text-green-500" />, bg: 'bg-green-50' },
    { label: 'Pending Verification', value: workers.filter(w => !w.verified).length, icon: <AlertCircle className="text-yellow-500" />, bg: 'bg-yellow-50' },
    { label: 'Suspended', value: workers.filter(w => w.status === 'Suspended').length, icon: <UserX className="text-red-500" />, bg: 'bg-red-50' },
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
    setIsDeleteModalOpen(true);
    setActionMenuOpenId(null);
  };

  const confirmDelete = async () => {
    try { await deleteAccount(workerToDelete.id,workerToDelete.email); await refresh(); setIsDeleteModalOpen(false); } catch(error) { alert(error.message); }
  };

  const toggleStatus = async (worker) => {
    try { await setAccountStatus(worker.id,worker.status==='Active'?'SUSPENDED':'ACTIVE'); await refresh(); } catch(error) { alert(error.message); } finally { setActionMenuOpenId(null); }
  };

  const approveWorker = async (worker) => {
    try { if(!worker.verificationId)throw new Error('No pending verification');await reviewWorker(worker.verificationId,'APPROVED',null);await refresh(); } catch(error){alert(error.message)} finally{setActionMenuOpenId(null)}
  };

  const openRemarksModal = (worker) => {
    setWorkerToReview(worker);
    setRemarks('');
    setIsRemarksModalOpen(true);
    setActionMenuOpenId(null);
  };

  const submitRemarks = async () => {
    try{if(!workerToReview.verificationId)throw new Error('No pending verification');await reviewWorker(workerToReview.verificationId,'NEEDS_DOCUMENTS',remarks);await refresh();setIsRemarksModalOpen(false)}catch(error){alert(error.message)}
  };

  const toggleAvailability = async (worker) => {
    try{await setWorkerAvailability(worker.id,worker.availability!=='Online');await refresh()}catch(error){alert(error.message)}finally{setActionMenuOpenId(null)}
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers Management</h1>
          <p className="text-gray-500 mt-1">Manage platform service providers and their verification</p>
        </div>
        <button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          + Add New Worker
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
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-4 border-b border-gray-200">
        <button 
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
        >
          All Workers
        </button>
        <button 
          className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => { setActiveTab('review'); setCurrentPage(1); }}
        >
          Review Queue 
          {workers.filter(w => !w.verified).length > 0 && (
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
              {workers.filter(w => !w.verified).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search workers by name, ID, or category..."
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
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedWorkers.length > 0 ? paginatedWorkers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {worker.name.charAt(0)}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                      <div className="text-sm text-gray-500">{worker.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{worker.category}</div>
                  <div className="text-sm text-gray-500">{worker.experience} yrs exp</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Star size={16} className="text-yellow-400 mr-1 fill-current" />
                    {worker.rating}
                  </div>
                  <div className="text-xs text-gray-500">{worker.jobsCompleted} jobs</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {worker.verified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle size={12} className="mr-1" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <AlertCircle size={12} className="mr-1" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    worker.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    worker.status === 'Suspended' ? 'bg-red-100 text-red-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {worker.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <button 
                    onClick={() => toggleActionMenu(worker.id)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  {/* Action Dropdown */}
                  {actionMenuOpenId === worker.id && (
                    <div className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-10 py-1">
                      <button onClick={() => handleViewDetails(worker)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                        <Eye size={16} className="mr-2 text-gray-400" /> View Details
                      </button>
                      
                      {activeTab === 'review' && !worker.verified && (
                        <>
                          <button onClick={() => approveWorker(worker)} className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 text-left">
                            <CheckCircle size={16} className="mr-2 text-green-500" /> Approve Worker
                          </button>
                          <button onClick={() => openRemarksModal(worker)} className="flex items-center w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 text-left">
                            <AlertCircle size={16} className="mr-2 text-yellow-500" /> Request Docs
                          </button>
                        </>
                      )}

                      <button onClick={() => toggleAvailability(worker)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                        <Clock size={16} className="mr-2 text-gray-400" /> 
                        Set: {worker.availability === 'Online' ? 'Busy' : worker.availability === 'Busy' ? 'Offline' : 'Online'}
                      </button>

                      <button onClick={() => toggleStatus(worker)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                        {worker.status === 'Active' ? <UserX size={16} className="mr-2 text-gray-400" /> : <UserCheck size={16} className="mr-2 text-gray-400" />}
                        {worker.status === 'Active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button onClick={() => handleDeleteClick(worker)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                        <Trash2 size={16} className="mr-2 text-red-500" /> Delete Worker
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <UserX size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No workers found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {filteredWorkers.length > 0 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      )}

      {/* Worker Details Drawer */}
      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title="Worker Details"
      >
        {selectedWorker && (
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                {selectedWorker.name.charAt(0)}
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedWorker.name}</h3>
                <p className="text-gray-500">{selectedWorker.id}</p>
                <div className="mt-1 flex gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    selectedWorker.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedWorker.status}
                  </span>
                  {selectedWorker.verified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircle size={10} className="mr-1" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Contact Information</h4>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail size={16} className="mr-3 text-gray-400" /> {selectedWorker.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-3 text-gray-400" /> {selectedWorker.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={16} className="mr-3 text-gray-400" /> {selectedWorker.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar size={16} className="mr-3 text-gray-400" /> Registered {selectedWorker.registeredDate}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Professional Profile</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="font-semibold text-gray-900">{selectedWorker.category}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Experience</p>
                  <p className="font-semibold text-gray-900">{selectedWorker.experience} Years</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Jobs Completed</p>
                  <p className="font-semibold text-gray-900">{selectedWorker.jobsCompleted}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Earnings</p>
                  <p className="font-semibold text-gray-900">${selectedWorker.earnings.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
              <button onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className="flex flex-col items-center text-center pb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete worker <span className="font-semibold text-gray-900">"{workerToDelete?.name}"</span>? This action cannot be undone.
          </p>
          <div className="flex w-full space-x-3">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Request Docs Remarks Modal */}
      <Modal
        isOpen={isRemarksModalOpen}
        onClose={() => setIsRemarksModalOpen(false)}
        title="Request Additional Documents"
      >
        <div className="pb-4">
          <p className="text-sm text-gray-600 mb-4">
            Provide remarks on what documents <span className="font-semibold text-gray-900">{workerToReview?.name}</span> needs to submit for verification.
          </p>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Please upload a clearer copy of your Valid ID..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
          />
          <div className="flex w-full space-x-3 mt-6">
            <button 
              onClick={() => setIsRemarksModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitRemarks}
              disabled={!remarks.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Send Request
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Workers;
