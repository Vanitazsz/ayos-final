import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  ShieldCheck,
  Mail,
  Phone,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { formatDateTime } from '../../../services/adminShared';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import Modal from '../../../components/ui/Modal';
import AccountDeleteModal from '../../../components/admin/AccountDeleteModal';
import ConfirmModal from '../../../components/ui/ConfirmModal';

export function UsersView({ model }) {
  const {
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
    itemsPerPage,
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
  } = model;
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-500 mt-1">
            Manage customer accounts, view details, and handle suspensions.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'customers' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          Customers
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'verifications' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          Pending Verification ({verifications.length})
        </button>
      </div>
      {loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      ) : null}
      <div className={activeTab === 'customers' ? 'block' : 'hidden'}>
        <Card>
          <CardHeader className="py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-96 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                aria-label="Search by name, email, or ID..."
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
              Showing {currentUsers.length} of {filteredUsers.length} users
            </div>
          </CardHeader>

          <div className="overflow-x-auto min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead scope="col">User Details</TableHead>
                  <TableHead scope="col">Contact</TableHead>
                  <TableHead scope="col">Registration Date</TableHead>
                  <TableHead scope="col">Bookings</TableHead>
                  <TableHead scope="col">Verification</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Skeleton Rows
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-4 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Skeleton className="w-10 h-10 rounded-full mr-3 shrink-0" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-10 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentUsers.length === 0 ? (
                  <TableRow hover={false}>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-navy">
                          {loadError ? 'Unable to load users' : 'No users found'}
                        </p>
                        <p className="text-sm">
                          {loadError
                            ? 'Review the error above and retry by refreshing the page.'
                            : "We couldn't find any users matching your search."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mr-3">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-navy">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <span className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" /> {user.email}
                          </span>
                          <span className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" /> {user.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">{user.registeredAt}</TableCell>
                      <TableCell>
                        <span className="font-medium text-navy bg-gray-100 px-2 py-1 rounded-md">
                          {user.bookings}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.verified ? (
                          <span className="inline-flex items-center text-xs font-medium text-success">
                            <ShieldCheck size={14} className="mr-1" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-gray-500">
                            Unverified
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-right relative">
                        <button
                          onClick={() => toggleActionMenu(user.id)}
                          aria-haspopup="true"
                          aria-expanded={actionMenuOpenId === user.id}
                          aria-label={`Open actions for ${user.name}`}
                          className="text-gray-400 hover:text-navy p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {actionMenuOpenId === user.id && (
                          <div
                            className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-border z-10 py-1 text-left"
                            role="menu"
                          >
                            <button
                              onClick={() => handleViewProfile(user)}
                              role="menuitem"
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye size={16} className="mr-2 text-gray-400" /> View Profile
                            </button>
                            <button
                              onClick={() => handleEditUser(user)}
                              role="menuitem"
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit size={16} className="mr-2 text-gray-400" /> Edit User
                            </button>
                            <button
                              onClick={() => void handleToggleStatus(user)}
                              disabled={actionLoadingId === `${user.id}:status`}
                              role="menuitem"
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Ban size={16} className="mr-2 text-gray-400" />{' '}
                              {user.status === 'Active' ? 'Suspend' : 'Reactivate'}
                            </button>
                            <button
                              onClick={() => void handleDelete(user)}
                              disabled={actionLoadingId === `${user.id}:delete`}
                              role="menuitem"
                              className="flex items-center w-full px-4 py-2 text-sm text-danger hover:bg-danger/5 disabled:opacity-50"
                            >
                              <Trash2 size={16} className="mr-2 text-danger" /> Delete Account
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium text-navy">
                {filteredUsers.length ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </span>{' '}
              to{' '}
              <span className="font-medium text-navy">
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
              </span>{' '}
              of <span className="font-medium text-navy">{filteredUsers.length}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous
              </Button>
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Logic to show pages around current page
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-navy'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {activeTab === 'verifications' ? (
        <Card>
          <CardHeader>
            <CardTitle>Customer Verifications</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col">ID Type</TableHead>
                  <TableHead scope="col">Submitted</TableHead>
                  <TableHead scope="col">Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div className="font-medium text-navy">{verification.customerName}</div>
                      <div className="text-xs text-gray-500">{verification.email}</div>
                    </TableCell>
                    <TableCell>{verification.id_type.replaceAll('_', ' ')}</TableCell>
                    <TableCell>{formatDateTime(verification.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setReviewNotes('');
                        }}
                      >
                        <Eye size={15} className="mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!verifications.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-gray-500">
                      No pending customer verifications.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}
      <Modal
        isOpen={Boolean(selectedVerification)}
        onClose={() => setSelectedVerification(null)}
        title="Review Customer ID"
        maxWidth="max-w-4xl"
      >
        {selectedVerification ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Front</p>
                <img
                  src={selectedVerification.frontUrl}
                  alt="Government ID front"
                  className="max-h-80 w-full rounded-lg border object-contain"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Back</p>
                {selectedVerification.backUrl ? (
                  <img
                    src={selectedVerification.backUrl}
                    alt="Government ID back"
                    className="max-h-80 w-full rounded-lg border object-contain"
                  />
                ) : (
                  <p className="text-sm text-gray-500">No back image</p>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Review notes</label>
              <textarea
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                maxLength={2000}
                className="min-h-24 w-full rounded-lg border border-gray-300 p-3"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="danger" disabled={reviewing} onClick={() => void decide('rejected')}>
                Reject
              </Button>
              <Button disabled={reviewing} onClick={() => void decide('approved')}>
                Approve
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="User Profile"
      >
        {selectedUser ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-navy">{selectedUser.name}</h3>
                <p className="text-gray-500">{selectedUser.status}</p>
              </div>
            </div>
            <dl className="grid gap-3 rounded-lg bg-gray-50 p-4">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-navy">{selectedUser.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-navy">{selectedUser.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-navy">{selectedUser.address || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Registered</dt>
                <dd className="font-medium text-navy">{selectedUser.registeredAt}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Bookings</dt>
                <dd className="font-medium text-navy">{selectedUser.bookings}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        {editUser ? (
          <form onSubmit={handleSaveUser} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Name
              <input
                required
                minLength={2}
                maxLength={120}
                value={editUser.name}
                onChange={(event) => setEditUser({ ...editUser, name: event.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Email
              <input
                value={editUser.email}
                readOnly
                className="mt-1 w-full rounded-lg border border-border bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Phone
              <input
                value={editUser.phone}
                onChange={(event) => setEditUser({ ...editUser, phone: event.target.value })}
                placeholder="+639XXXXXXXXX"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSavingUser}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
      <AccountDeleteModal
        account={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={async (deletedUser) => {
          await refresh();
          toast.success(
            'User deleted',
            `${deletedUser.name} and all related records were permanently deleted.`,
          );
        }}
      />
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
        variant="danger"
      />
    </div>
  );
}
