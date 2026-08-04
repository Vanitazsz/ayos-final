import { Trash2, Search, RotateCcw, ShieldAlert, AlertCircle } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { TRASH_TABS } from '../logic/TrashPageLogic';
const tabs = TRASH_TABS;
export function TrashView({ model }) {
  const {
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
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trash & Recovery</h1>
          <p className="text-gray-500 mt-1">
            Manage soft-deleted items before permanent removal (30 days)
          </p>
        </div>
        {filteredItems.length > 0 && (
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={handleRestoreAll}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
            >
              <RotateCcw size={18} className="mr-2" /> Restore All
            </button>
            <button
              onClick={handleEmptyTrash}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
            >
              <Trash2 size={18} className="mr-2" /> Empty Trash
            </button>
          </div>
        )}
      </div>
      {isLoading && (
        <div className="flex justify-center py-8 text-gray-500">
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2" />{' '}
          Loading...
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
                setSearchTerm('');
              }}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}{' '}
              <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                {items[tab].length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 bg-gray-50/50 border-b border-gray-100">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              aria-label={`Search deleted ${activeTab.toLowerCase()}...`}
              placeholder={`Search deleted ${activeTab.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Deleted Item
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Deleted By
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date Deleted
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Restore Deadline
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
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.item}</div>
                    <div className="text-xs text-gray-500">{item.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.deletedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.deletedDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                      <AlertCircle size={12} className="mr-1" /> {item.restoreDeadline}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="text-gray-500 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-colors flex items-center border border-transparent hover:border-green-200"
                        title="Restore"
                      >
                        <RotateCcw size={16} className="mr-1" /> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors flex items-center border border-transparent hover:border-red-200"
                        title="Delete Permanently"
                      >
                        <ShieldAlert size={16} className="mr-1" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  Trash is empty for {activeTab}.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredItems.length > 0 && (
          <div className="border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
      />
    </div>
  );
}
