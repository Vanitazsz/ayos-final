import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Users = lazy(() => import('./pages/admin/Users'));
const Workers = lazy(() => import('./pages/admin/Workers'));
const Bookings = lazy(() => import('./pages/admin/Bookings'));
const Services = lazy(() => import('./pages/admin/Services'));
const Payments = lazy(() => import('./pages/admin/Payments'));
const Reviews = lazy(() => import('./pages/admin/Reviews'));
const Support = lazy(() => import('./pages/admin/Support'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Trash = lazy(() => import('./pages/admin/Trash'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Profile = lazy(() => import('./pages/admin/Profile'));
const Login = lazy(() => import('./pages/auth/Login'));
const Subdivisions = lazy(() => import('./pages/admin/Subdivisions'));
const Subscriptions = lazy(() => import('./pages/admin/Subscriptions'));

function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div
            role="status"
            aria-label="Loading page"
            className="min-h-screen flex items-center justify-center bg-background"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Redirect Root to Dashboard */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

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
