import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  User,
  Briefcase,
  Calendar,
  Wrench,
  CreditCard,
  Star,
  Headset,
  FileBarChart,
  BarChart3,
  Bell,
  ShieldCheck,
  ClipboardList,
  Trash2,
  Settings,
  UserCircle,
  LogOut,
  ChevronDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  MessageSquare,
  Activity,
  Megaphone,
  MapPinned,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigationGroups = [
  {
    title: 'Dashboard',
    isLink: true,
    to: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'User Management',
    icon: Users,
    items: [
      { name: 'Users', to: '/admin/users', icon: User },
      { name: 'Workers', to: '/admin/workers', icon: Briefcase },
    ],
  },
  {
    title: 'Operations',
    icon: Activity,
    items: [
      { name: 'Bookings', to: '/admin/bookings', icon: Calendar },
      { name: 'Services', to: '/admin/services', icon: Wrench },
      { name: 'Payments', to: '/admin/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Community',
    icon: MessageSquare,
    items: [
      { name: 'Reviews', to: '/admin/reviews', icon: Star },
      { name: 'Support', to: '/admin/support', icon: Headset },
    ],
  },
  {
    title: 'Insights',
    icon: PieChart,
    items: [
      { name: 'Reports', to: '/admin/reports', icon: FileBarChart },
      { name: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Communication',
    icon: Megaphone,
    items: [{ name: 'Notifications', to: '/admin/notifications', icon: Bell }],
  },
  {
    title: 'Administration',
    icon: ShieldCheck,
    items: [
      { name: 'Audit Logs', to: '/admin/auditlogs', icon: ClipboardList },
      { name: 'Trash', to: '/admin/trash', icon: Trash2 },
      { name: 'Settings', to: '/admin/settings', icon: Settings },
      { name: 'Subdivisions', to: '/admin/subdivisions', icon: MapPinned },
      { name: 'Subscriptions', to: '/admin/subscriptions', icon: Crown },
    ],
  },
];

const NavGroup = ({ group, effectiveCollapsed, setIsMobileOpen }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(`sidebar_group_${group.title}`);
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const location = useLocation();
  const isActiveGroup = group.items?.some((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    localStorage.setItem(`sidebar_group_${group.title}`, JSON.stringify(isExpanded));
  }, [isExpanded, group.title]);

  useEffect(() => {
    if (isActiveGroup && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActiveGroup]);

  if (group.isLink) {
    const isActive = location.pathname.startsWith(group.to);
    const GroupIcon = group.icon;
    return (
      <div className="mb-4 px-3">
        <NavLink
          to={group.to}
          onClick={() => setIsMobileOpen(false)}
          className={`flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors group ${
            effectiveCollapsed ? 'justify-center' : ''
          } ${isActive ? 'bg-primary/20 text-white' : 'text-gray-300 hover:text-white'}`}
          title={effectiveCollapsed ? group.title : undefined}
        >
          <GroupIcon
            className={`shrink-0 ${effectiveCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'} ${
              isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-200'
            }`}
          />
          {!effectiveCollapsed && <span>{group.title}</span>}
        </NavLink>
      </div>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div className="mb-4 px-3">
      <button
        onClick={() => !effectiveCollapsed && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center py-2 text-sm font-semibold rounded-xl transition-colors group ${
          effectiveCollapsed ? 'justify-center px-3' : 'justify-between px-3'
        } ${isActiveGroup && effectiveCollapsed ? 'text-white bg-white/10' : 'text-gray-300 hover:text-white'}`}
        title={effectiveCollapsed ? group.title : undefined}
      >
        <div className="flex items-center">
          <GroupIcon
            className={`shrink-0 ${effectiveCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'} ${
              isActiveGroup ? 'text-primary' : 'text-gray-400 group-hover:text-gray-200'
            }`}
          />
          {!effectiveCollapsed && <span>{group.title}</span>}
        </div>
        {!effectiveCollapsed && (
          <span
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-gray-800' : 'text-gray-400'}`}
          >
            <ChevronDown size={16} />
          </span>
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-250 ease-in-out ${
          isExpanded && !effectiveCollapsed ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pl-11 pr-2 space-y-1.5 pt-1">
          {(group.items || []).map((item) => {
            const isItemActive = location.pathname.startsWith(item.to);
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isItemActive
                    ? 'bg-primary/20 text-white font-semibold'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <ItemIcon
                  className={`h-4 w-4 mr-3 shrink-0 transition-colors ${isItemActive ? 'text-primary' : 'text-gray-500'}`}
                />
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const effectiveCollapsed = isCollapsed && !isHovered;

  return (
    <>
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button
          aria-label="Open navigation"
          onClick={() => setIsMobileOpen(true)}
          className={`p-3.5 bg-primary text-white rounded-full shadow-lg transition-transform ${isMobileOpen ? 'scale-0' : 'scale-100'}`}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        aria-label="Administrator navigation"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-navy border-r border-navy-800 flex flex-col transition-all duration-300 ease-in-out fixed md:relative z-50 h-screen shadow-[4px_0_24px_rgba(0,0,0,0.2)] ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${effectiveCollapsed && !isMobileOpen ? 'md:w-20' : 'md:w-72'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 shrink-0">
          <div
            className={`flex items-center ${effectiveCollapsed && !isMobileOpen ? 'mx-auto' : ''}`}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-display font-bold text-white shadow-md shrink-0">
              A
            </div>
            {(!effectiveCollapsed || isMobileOpen) && (
              <span className="ml-3 font-display font-bold text-xl text-white tracking-tight whitespace-nowrap">
                A-yos Admin
              </span>
            )}
          </div>

          {isMobileOpen && (
            <button
              aria-label="Close navigation"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav
          aria-label="Administrator navigation links"
          className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-4 custom-scrollbar"
        >
          {navigationGroups.map((group) => (
            <NavGroup
              key={group.title}
              group={group}
              effectiveCollapsed={effectiveCollapsed && !isMobileOpen}
              setIsMobileOpen={setIsMobileOpen}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
          <NavLink
            to="/admin/profile"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors group
              ${isActive ? 'bg-primary/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}
              ${effectiveCollapsed && !isMobileOpen ? 'justify-center' : ''}
            `}
            title={effectiveCollapsed && !isMobileOpen ? 'Profile' : undefined}
          >
            {({ isActive }) => (
              <>
                <UserCircle
                  className={`shrink-0 ${effectiveCollapsed && !isMobileOpen ? 'h-5 w-5' : 'h-5 w-5 mr-3'} ${
                    isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-200'
                  }`}
                />
                {(!effectiveCollapsed || isMobileOpen) && <span>Profile</span>}
              </>
            )}
          </NavLink>

          <button
            onClick={logout}
            className={`
              w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors
              text-red-400 hover:bg-red-500/10 hover:text-red-300 group
              ${effectiveCollapsed && !isMobileOpen ? 'justify-center' : ''}
            `}
            title={effectiveCollapsed && !isMobileOpen ? 'Log Out' : undefined}
          >
            <LogOut
              className={`shrink-0 ${effectiveCollapsed && !isMobileOpen ? 'h-5 w-5' : 'h-5 w-5 mr-3'}`}
            />
            {(!effectiveCollapsed || isMobileOpen) && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
