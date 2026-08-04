import {
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  EyeOff,
  Trash2,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  REVIEW_STATUS_BADGE,
  badgeFor,
} from '../../../services/statusMeta';

export function ReviewsView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterRating,
    setFilterRating,
    currentPage,
    setCurrentPage,
    actionMenuOpenId,
    setActionMenuOpenId,
    confirm,
    closeConfirm,
    filteredReviews,
    totalPages,
    paginatedReviews,
    stats,
    toggleStatus,
    deleteReview,
    renderStars,
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews & Moderation</h1>
          <p className="text-gray-500 mt-1">Monitor user feedback and moderate flagged reviews</p>
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

      {/* Filters and Search */}
      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            aria-label="Search reviews, customers, or workers..."
            placeholder="Search reviews, customers, or workers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="All">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews Table/List */}
      <div className="bg-white shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Customer / Worker
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Review
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
            {paginatedReviews.length > 0 ? (
              paginatedReviews.map((review) => (
                <tr
                  key={review.id}
                  className={`hover:bg-gray-50 transition-colors ${review.status === 'Hidden' ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{review.customer}</span>
                      <span className="text-xs text-gray-500 flex items-center mt-1">
                        Reviewed{' '}
                        <span className="font-medium text-blue-600 mx-1">{review.worker}</span>
                      </span>
                      <span className="text-xs text-gray-400 mt-1">
                        {review.date} • {review.service}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="mb-2">{renderStars(review.rating)}</div>
                      <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeFor(REVIEW_STATUS_BADGE, review.status)}`}
                    >
                      {review.status === 'Published' && (
                        <CheckCircle size={12} className="mr-1" />
                      )}
                      {review.status === 'Hidden' && (
                        <EyeOff size={12} className="mr-1" />
                      )}
                      {review.status === 'Flagged' && (
                        <AlertTriangle size={12} className="mr-1" />
                      )}
                      {review.status === 'Published'
                        ? 'Published'
                        : review.status === 'Hidden'
                          ? 'Hidden'
                          : `Flagged (${review.reportCount})`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <button
                      onClick={() =>
                        setActionMenuOpenId(actionMenuOpenId === review.id ? null : review.id)
                      }
                      aria-haspopup="true"
                      aria-expanded={actionMenuOpenId === review.id}
                      aria-label={`Open actions for ${review.customer}`}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {actionMenuOpenId === review.id && (
                      <div
                        className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-10 py-1"
                        role="menu"
                      >
                        {review.status !== 'Hidden' ? (
                          <button
                            onClick={() => toggleStatus(review.id, 'Hidden')}
                            role="menuitem"
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          >
                            <EyeOff size={16} className="mr-2 text-gray-400" /> Hide Review
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStatus(review.id, 'Published')}
                            role="menuitem"
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                          >
                            <CheckCircle size={16} className="mr-2 text-green-500" /> Publish Review
                          </button>
                        )}

                        <button
                          onClick={() => deleteReview(review.id)}
                          role="menuitem"
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100 mt-1 pt-1"
                        >
                          <Trash2 size={16} className="mr-2 text-red-500" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <MessageSquare size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredReviews.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Reject"
        variant="danger"
      />
    </div>
  );
}
