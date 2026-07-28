import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, HardHat, Calendar, DollarSign, Settings, Star, AlertCircle } from 'lucide-react';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    { id: 'dashboard', title: 'Go to Dashboard', icon: <Search size={16} />, path: '/admin/dashboard' },
    { id: 'users', title: 'Manage Users', icon: <Users size={16} />, path: '/admin/users' },
    { id: 'workers', title: 'Manage Workers', icon: <HardHat size={16} />, path: '/admin/workers' },
    { id: 'bookings', title: 'View Bookings', icon: <Calendar size={16} />, path: '/admin/bookings' },
    { id: 'payments', title: 'Payments & Revenue', icon: <DollarSign size={16} />, path: '/admin/payments' },
    { id: 'reviews', title: 'Customer Reviews', icon: <Star size={16} />, path: '/admin/reviews' },
    { id: 'settings', title: 'Platform Settings', icon: <Settings size={16} />, path: '/admin/settings' },
  ];

  const filteredActions = query 
    ? actions.filter(action => action.title.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const handleSelect = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100 mx-4">
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-lg"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-1 ml-3">
            <span className="px-1.5 py-0.5 rounded border border-gray-200 text-xs text-gray-500 font-medium bg-gray-50">ESC</span>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filteredActions.length > 0 ? (
            <div className="px-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Suggestions
              </div>
              {filteredActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action.path)}
                  className="w-full flex items-center px-3 py-3 rounded-lg text-left hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors group"
                >
                  <div className="text-gray-400 group-hover:text-blue-500 mr-3">
                    {action.icon}
                  </div>
                  <span className="font-medium">{action.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 px-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No results found for "{query}"</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white font-sans">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white font-sans">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-white font-sans">Enter</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="font-medium text-gray-400">A-yos Global Search</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
