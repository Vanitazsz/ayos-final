import React, { useEffect, useState } from 'react';
import { 
  Star, Search, Filter, MoreVertical, 
  ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle,
  CheckCircle, EyeOff, Trash2, CornerUpLeft
} from 'lucide-react';
import Pagination from '../../components/ui/Pagination';

import { loadReviews, moderateReview, subscribe } from '../../services/adminData';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  const reviewsPerPage = 10;
  const refresh=async()=>setReviews(await loadReviews());
  useEffect(()=>{void refresh();return subscribe('reviews',refresh)},[]);

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = r.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.worker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = filterRating === 'All' || r.rating.toString() === filterRating;
    return matchesSearch && matchesRating;
  });

  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const paginatedReviews = filteredReviews.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage);

  const stats = [
    { label: 'Average Rating', value: '4.2', icon: <Star className="text-yellow-500 fill-current" />, bg: 'bg-yellow-50' },
    { label: 'Positive Reviews', value: reviews.filter(r => r.rating >= 4).length, icon: <ThumbsUp className="text-green-500" />, bg: 'bg-green-50' },
    { label: 'Negative Reviews', value: reviews.filter(r => r.rating <= 2).length, icon: <ThumbsDown className="text-red-500" />, bg: 'bg-red-50' },
    { label: 'Flagged / Reported', value: reviews.filter(r => r.status === 'Flagged').length, icon: <AlertTriangle className="text-orange-500" />, bg: 'bg-orange-50' },
  ];

  const toggleStatus = async (id, newStatus) => {
    try { await moderateReview(id,newStatus==='Published'?'PUBLISHED':'REJECTED'); await refresh(); } catch(error) { alert(error.message); } finally { setActionMenuOpenId(null); }
  };

  const deleteReview = async (id) => {
    if(window.confirm('Reject and hide this review?')) await toggleStatus(id,'Hidden');
  };

  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={16} 
            className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

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

      {/* Filters and Search */}
      <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Customer / Worker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedReviews.length > 0 ? paginatedReviews.map((review) => (
              <tr key={review.id} className={`hover:bg-gray-50 transition-colors ${review.status === 'Hidden' ? 'opacity-60 bg-gray-50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{review.customer}</span>
                    <span className="text-xs text-gray-500 flex items-center mt-1">
                      Reviewed <span className="font-medium text-blue-600 mx-1">{review.worker}</span>
                    </span>
                    <span className="text-xs text-gray-400 mt-1">{review.date} • {review.service}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="mb-2">{renderStars(review.rating)}</div>
                    <p className="text-sm text-gray-700 italic">"{review.comment}"</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {review.status === 'Published' && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1" /> Published</span>}
                  {review.status === 'Hidden' && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><EyeOff size={12} className="mr-1" /> Hidden</span>}
                  {review.status === 'Flagged' && (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle size={12} className="mr-1" /> Flagged ({review.reportCount})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <button 
                    onClick={() => setActionMenuOpenId(actionMenuOpenId === review.id ? null : review.id)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  
                  {actionMenuOpenId === review.id && (
                    <div className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-100 z-10 py-1">
                      <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                        <CornerUpLeft size={16} className="mr-2 text-blue-500" /> Reply as Admin
                      </button>
                      
                      {review.status !== 'Hidden' ? (
                        <button onClick={() => toggleStatus(review.id, 'Hidden')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <EyeOff size={16} className="mr-2 text-gray-400" /> Hide Review
                        </button>
                      ) : (
                        <button onClick={() => toggleStatus(review.id, 'Published')} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                          <CheckCircle size={16} className="mr-2 text-green-500" /> Publish Review
                        </button>
                      )}
                      
                      <button onClick={() => deleteReview(review.id)} className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100 mt-1 pt-1">
                        <Trash2 size={16} className="mr-2 text-red-500" /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
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
    </div>
  );
};

export default Reviews;
