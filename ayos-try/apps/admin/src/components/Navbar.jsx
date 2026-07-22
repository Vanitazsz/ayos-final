import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Generate breadcrumbs from pathname
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Current date formatted
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
      {/* Left section: Breadcrumbs */}
      <div className="flex items-center">
        <div className="hidden md:flex items-center text-sm font-medium text-gray-500">
          <span className="capitalize">A-yos</span>
          {pathnames.map((name, index) => {
            const isLast = index === pathnames.length - 1;
            return (
              <React.Fragment key={name}>
                <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
                <span className={`capitalize ${isLast ? 'text-navy font-semibold' : ''}`}>
                  {name}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right section: Actions & Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Global Search */}
        <div className="hidden md:flex relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search anything (Cmd+K)"
            className="block w-64 pl-10 pr-3 py-1.5 border border-border rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Date Display */}
        <div className="hidden lg:block text-sm text-gray-500 font-medium px-2">
          {currentDate}
        </div>

        <div className="h-6 w-px bg-border hidden sm:block"></div>

        {/* Signed-in administrator */}
        <div className="flex items-center space-x-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center font-medium text-sm border-2 border-white shadow-sm overflow-hidden">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold text-navy leading-tight">{user?.name || 'Admin'}</div>
            <div className="text-xs text-gray-500 leading-tight">{user?.role || 'Super Admin'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
