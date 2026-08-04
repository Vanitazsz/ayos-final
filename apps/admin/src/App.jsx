import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Skeleton from './components/ui/Skeleton';

const Login = React.lazy(() => import('./pages/auth/Login'));
const Dashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const Users = React.lazy(() => import('./pages/admin/Users'));
const Workers = React.lazy(() => import('./pages/admin/Workers'));
const Bookings = React.lazy(() => import('./pages/admin/Bookings'));
const Services = React.lazy(() => import('./pages/admin/Services'));
const Payments = React.lazy(() => import('./pages/admin/Payments'));
const Reviews = React.lazy(() => import('./pages/admin/Reviews'));
const Support = React.lazy(() => import('./pages/admin/Support'));
const Reports = React.lazy(() => import('./pages/admin/Reports'));
const Analytics = React.lazy(() => import('./pages/admin/Analytics'));
const Notifications = React.lazy(() => import('./pages/admin/Notifications'));
const AuditLogs = React.lazy(() => import('./pages/admin/AuditLogs'));
const Trash = React.lazy(() => import('./pages/admin/Trash'));
const Settings = React.lazy(() => import('./pages/admin/Settings'));
const Profile = React.lazy(() => import('./pages/admin/Profile'));
const Subdivisions = React.lazy(() => import('./pages/admin/Subdivisions'));
const Subscriptions = React.lazy(() => import('./pages/admin/Subscriptions'));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Skeleton className="h-8 w-48 mb-4" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Redirect Root to Dashboard */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />

            {/* Placeholder routes for future modules */}
            <Route path="workers" element={<Workers />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="services" element={<Services />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="support" element={<Support />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="auditlogs" element={<AuditLogs />} />
            <Route path="trash" element={<Trash />} />
            <Route path="settings" element={<Settings />} />
            <Route path="subdivisions" element={<Subdivisions />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
