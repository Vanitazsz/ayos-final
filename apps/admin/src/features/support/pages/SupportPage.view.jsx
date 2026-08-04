import { HeadphonesIcon, Search, Filter, CheckCircle, Send, User } from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Pagination from '../../../components/ui/Pagination';
import { formatDateTime } from '../../../services/adminShared';

export function SupportView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    selectedTicket,
    isDrawerOpen,
    setIsDrawerOpen,
    replyText,
    setReplyText,
    safetyCases,
    filteredTickets,
    totalPages,
    paginatedTickets,
    stats,
    getPriorityColor,
    getStatusColor,
    openTicket,
    handleSendReply,
    markResolved,
    escalateTicket,
    reopenTicket,
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-500 mt-1">Manage customer and worker support tickets</p>
        </div>
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8 overflow-x-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Safety Reports & Disputes</h2>
          <p className="text-sm text-gray-500">Read-only visibility into booking safety cases.</p>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Booking
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Reason
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {safetyCases.length ? (
              safetyCases.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.kind}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.bookingId ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-lg">{item.reason}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(item.createdAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                  No safety cases found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            aria-label="Search tickets by ID or subject..."
            placeholder="Search tickets by ID or subject..."
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
            <option value="Open">Open</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
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
                Ticket Info
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Subject & Category
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Assigned To
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Priority
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
            {paginatedTickets.length > 0 ? (
              paginatedTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openTicket(ticket)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{ticket.id}</div>
                    <div className="text-xs text-gray-500">{ticket.date}</div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">{ticket.customer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {ticket.subject}
                    </div>
                    <div className="text-xs text-gray-500">{ticket.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm ${!ticket.assignedTo ? 'text-gray-400 italic' : 'text-gray-900'}`}
                    >
                      {ticket.assignedTo || 'Not assigned'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative"></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <HeadphonesIcon size={48} className="text-gray-300 mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-gray-900">No tickets found</h3>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredTickets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Ticket Detail & Chat Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Ticket ${selectedTicket?.id}`}
        width="w-[500px]"
      >
        {selectedTicket && (
          <div className="flex flex-col h-full -mx-6 -my-6">
            {/* Header info */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedTicket.subject}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}
                >
                  {selectedTicket.status}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}
                >
                  {selectedTicket.priority} Priority
                </span>
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                  {selectedTicket.category}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-gray-500">Requested by</p>
                  <p className="font-medium flex items-center mt-1">
                    <User size={14} className="mr-1" /> {selectedTicket.customer}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-right">Assigned to</p>
                  <p className="font-medium flex items-center mt-1 text-right">
                    {selectedTicket.assignedTo || 'Not assigned'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {selectedTicket.customer.charAt(0)}
                  </div>
                </div>
                <div>
                  <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-800 rounded-tl-none">
                    <p>{selectedTicket.description}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{selectedTicket.date}</p>
                </div>
              </div>
              {selectedTicket.messages.map((message) => {
                const fromRequester = message.sender === selectedTicket.customer;
                return (
                  <div
                    key={message.id}
                    className={`flex ${fromRequester ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`flex-shrink-0 ${fromRequester ? 'mr-3' : 'ml-3'}`}>
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${fromRequester ? 'bg-blue-100 text-blue-600' : 'bg-gray-800 text-white'}`}
                      >
                        {message.sender.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`rounded-lg p-3 text-sm ${fromRequester ? 'bg-gray-100 text-gray-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}
                      >
                        <p>{message.body}</p>
                      </div>
                      <p
                        className={`text-xs text-gray-400 mt-1 ${fromRequester ? '' : 'text-right'}`}
                      >
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-gray-200 bg-white shrink-0">
              {selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500 font-medium">
                    This ticket is {selectedTicket.status.toLowerCase()}.
                  </p>
                  <button
                    onClick={reopenTicket}
                    className="mt-2 text-sm text-blue-600 font-medium hover:underline"
                  >
                    Reopen Ticket
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={markResolved}
                      className="text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded border border-green-200 hover:bg-green-100"
                    >
                      <CheckCircle size={12} className="inline mr-1" /> Mark Resolved
                    </button>
                    <button
                      onClick={escalateTicket}
                      className="text-xs font-medium bg-red-50 text-red-700 px-3 py-1.5 rounded border border-red-200 hover:bg-red-100"
                    >
                      Escalate
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply to the customer..."
                      className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                    ></textarea>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSendReply}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                      <Send size={16} className="mr-2" /> Send Reply
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
