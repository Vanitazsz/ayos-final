import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  ShieldCheck,
  Mail,
  Phone,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import {
  loadCustomerVerifications,
  loadUsers,
  reviewCustomerVerification,
  subscribe,
} from '../../services/adminData';

const Users = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const itemsPerPage = 10;
  const refresh = async () => {
    try {
      const [customerRows, verificationRows] = await Promise.all([
        loadUsers(),
        loadCustomerVerifications(),
      ]);
      setUsers(customerRows);
      setVerifications(verificationRows);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    const stops = [subscribe('accounts', refresh), subscribe('customer_verifications', refresh)];
    return () => stops.forEach((stop) => stop());
  }, []);
  const decide = async (decision) => {
    if (!selectedVerification) return;
    if (
      !window.confirm(
        `${decision === 'approved' ? 'Approve' : 'Reject'} this identity verification?`,
      )
    )
      return;
    setReviewing(true);
    try {
      await reviewCustomerVerification(selectedVerification.id, decision, reviewNotes);
      setSelectedVerification(null);
      setReviewNotes('');
      await refresh();
    } catch (error) {
      alert(error.message);
    } finally {
      setReviewing(false);
    }
  };

  const toggleActionMenu = (id) => {
    if (actionMenuOpenId === id) setActionMenuOpenId(null);
    else setActionMenuOpenId(id);
  };

  // Filter
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getStatusBadge = (status) => {
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
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy tracking-tight">
            Users Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage customer accounts, view details, and handle suspensions.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
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
      <div className={activeTab === 'customers' ? 'block' : 'hidden'}>
        <Card>
          <CardHeader className="py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-96 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
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
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>User Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.length === 0 ? (
                  <TableRow hover={false}>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Search className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-navy">No users found</p>
                        <p className="text-sm">We couldn't find any users matching your search.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
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
                          className="text-gray-400 hover:text-navy p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {actionMenuOpenId === user.id && (
                          <div className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-border z-10 py-1 text-left">
                            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Eye size={16} className="mr-2 text-gray-400" /> View Profile
                            </button>
                            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Edit size={16} className="mr-2 text-gray-400" /> Edit User
                            </button>
                            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Ban size={16} className="mr-2 text-gray-400" /> Suspend
                            </button>
                            <button className="flex items-center w-full px-4 py-2 text-sm text-danger hover:bg-danger/5">
                              <Trash2 size={16} className="mr-2 text-danger" /> Soft Delete
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
              <span className="font-medium text-navy">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
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
                  <TableHead>Customer</TableHead>
                  <TableHead>ID Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Documents</TableHead>
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
                    <TableCell>{new Date(verification.created_at).toLocaleString()}</TableCell>
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
    </div>
  );
};

export default Users;
