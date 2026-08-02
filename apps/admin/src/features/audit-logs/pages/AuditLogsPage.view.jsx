import { Search, Filter, Monitor, Smartphone, Globe, CheckCircle, XCircle } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';

export function AuditLogsView({ model }) {
  const {
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
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track and monitor all administrator activities</p>
        </div>
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

      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            aria-label="Search by Admin, Action, or IP..."
            placeholder="Search by Admin, Action, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
          >
            <option value="All">All Modules</option>
            <option value="Auth">Authentication</option>
            <option value="Workers">Workers</option>
            <option value="Bookings">Bookings</option>
            <option value="Payments">Payments</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Timestamp
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Admin
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Module
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Action & Target
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                IP Address
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Device
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap text-gray-500">{log.timestamp}</td>
                  <td className="px-6 py-3 whitespace-nowrap font-medium text-gray-900">
                    {log.admin}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{log.module}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{log.action}</div>
                    <div className="text-xs text-gray-500 mt-1">Target: {log.target}</div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center text-xs text-gray-500">
                      <Globe size={12} className="mr-1" /> {log.ip}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center text-gray-700 text-xs">
                      {log.isMobile ? (
                        <Smartphone size={14} className="mr-2 text-gray-400" />
                      ) : (
                        <Monitor size={14} className="mr-2 text-gray-400" />
                      )}
                      {log.device} • {log.browser}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right">
                    {log.status === 'Success' ? (
                      <span className="inline-flex items-center text-green-600 font-medium">
                        <CheckCircle size={14} className="mr-1" /> Success
                      </span>
                    ) : log.status === 'Failed' ? (
                      <span className="inline-flex items-center text-red-600 font-medium">
                        <XCircle size={14} className="mr-1" /> Failed
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredLogs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
