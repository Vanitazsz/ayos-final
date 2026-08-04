export const BOOKING_STATUS_BADGE = {
  Completed: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Ongoing: 'bg-indigo-100 text-indigo-800',
  'En Route': 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-gray-100 text-gray-800',
  Refunded: 'bg-gray-100 text-gray-800',
};

export const PAYMENT_STATUS_BADGE = {
  Completed: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Failed: 'bg-red-100 text-red-800',
  Refunded: 'bg-gray-100 text-gray-800',
};

export const NOTIFICATION_STATUS_BADGE = {
  Sent: 'bg-green-100 text-green-800',
  Scheduled: 'bg-yellow-100 text-yellow-800',
  Draft: 'bg-gray-100 text-gray-800',
  Failed: 'bg-red-100 text-red-800',
};

export const SUPPORT_STATUS_BADGE = {
  Open: 'bg-blue-100 text-blue-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
};

export const REVIEW_STATUS_BADGE = {
  Published: 'bg-green-100 text-green-800',
  Hidden: 'bg-gray-100 text-gray-800',
  Flagged: 'bg-red-100 text-red-800',
};

export const DEFAULT_BADGE = 'bg-gray-100 text-gray-800';

export const badgeFor = (map, status) => map[status] ?? DEFAULT_BADGE;
