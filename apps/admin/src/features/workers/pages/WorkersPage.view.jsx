import {
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  AlertCircle,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';
import { money } from '../../../services/adminShared';
import AccountDeleteModal from '../../../components/admin/AccountDeleteModal';

export function WorkersView({ model }) {
  const {
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
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers Management</h1>
          <p className="text-gray-500 mt-1">
            Manage platform service providers and their verification
          </p>
        </div>
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

      {/* Tabs */}
      <div className="flex space-x-4 mb-4 border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => {
            setActiveTab('all');
            setCurrentPage(1);
          }}
        >
          All Workers
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => {
            setActiveTab('review');
            setCurrentPage(1);
          }}
        >
          Review Queue
          {workers.filter(needsReview).length > 0 && (
            <span
              className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
            >
              {workers.filter(needsReview).length}
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
            aria-label="Search workers by name, ID, or category..."
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

      {loadError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      ) : null}

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Worker
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Category
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rating
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Verification
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Matching
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  Loading workers…
                </td>
              </tr>
            ) : paginatedWorkers.length > 0 ? (
              paginatedWorkers.map((worker) => (
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
                    ) : worker.verificationId ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle size={12} className="mr-1" />{' '}
                        {worker.verificationStatus.replaceAll('_', ' ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Not submitted
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {worker.matchingReady ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" /> Ready
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <AlertCircle size={12} className="mr-1" /> Incomplete
                        </span>
                        <div className="mt-1 text-xs text-gray-500">
                          {worker.matchingMissing.join(', ')}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        worker.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : worker.status === 'Suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() => toggleActionMenu(worker.id)}
                      aria-haspopup="true"
                      aria-expanded={actionMenuOpenId === worker.id}
                      aria-label={`Open actions for ${worker.name}`}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* Action Dropdown */}
                    {actionMenuOpenId === worker.id && (
                      <div
                        className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-10 py-1"
                        role="menu"
                      >
                        <button
                          onClick={() => handleViewDetails(worker)}
                          role="menuitem"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <Eye size={16} className="mr-2 text-gray-400" /> View Details
                        </button>

                        {activeTab === 'review' && needsReview(worker) && (
                          <>
                            <button
                              onClick={() => approveWorker(worker)}
                              role="menuitem"
                              className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50 text-left"
                            >
                              <CheckCircle size={16} className="mr-2 text-green-500" /> Approve
                              Worker
                            </button>
                            <button
                              onClick={() => openRemarksModal(worker)}
                              role="menuitem"
                              className="flex items-center w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 text-left"
                            >
                              <AlertCircle size={16} className="mr-2 text-yellow-500" /> Request
                              Docs
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => toggleAvailability(worker)}
                          role="menuitem"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          <Clock size={16} className="mr-2 text-gray-400" />
                          Set:{' '}
                          {worker.availability === 'Online'
                            ? 'Busy'
                            : worker.availability === 'Busy'
                              ? 'Offline'
                              : 'Online'}
                        </button>

                        <button
                          onClick={() => toggleStatus(worker)}
                          role="menuitem"
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                          {worker.status === 'Active' ? (
                            <UserX size={16} className="mr-2 text-gray-400" />
                          ) : (
                            <UserCheck size={16} className="mr-2 text-gray-400" />
                          )}
                          {worker.status === 'Active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(worker)}
                          role="menuitem"
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                        >
                          <Trash2 size={16} className="mr-2 text-red-500" /> Delete Worker
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center">
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
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Worker Details">
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
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      selectedWorker.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
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
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Contact Information
              </h4>
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
                  <Calendar size={16} className="mr-3 text-gray-400" /> Registered{' '}
                  {selectedWorker.registeredDate}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Professional Profile
              </h4>
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
                  <p className="font-semibold text-gray-900">
                    {money(selectedWorker.earnings)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <AccountDeleteModal
        account={workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onDeleted={async () => {
          await refresh();
        }}
      />

      {/* Request Docs Remarks Modal */}
      <Modal
        isOpen={isRemarksModalOpen}
        onClose={() => setIsRemarksModalOpen(false)}
        title="Request Additional Documents"
      >
        <div className="pb-4">
          <p className="text-sm text-gray-600 mb-4">
            Provide remarks on what documents{' '}
            <span className="font-semibold text-gray-900">{workerToReview?.name}</span> needs to
            submit for verification.
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
}
