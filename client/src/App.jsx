import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

import DashboardLayout from './layouts/DashboardLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';

import DashboardPage from './pages/DashboardPage.jsx';
import ReportIssuePage from './pages/ReportIssuePage.jsx';
import AllIssuesPage from './pages/AllIssuesPage.jsx';
import IssueDetailPage from './pages/IssueDetailPage.jsx';
import NearbyIssuesPage from './pages/NearbyIssuesPage.jsx';
import MyReportsPage from './pages/MyReportsPage.jsx';
import DepartmentOverviewPage from './pages/DepartmentOverviewPage.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Dashboard / Main Platform Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/report" element={<ReportIssuePage />} />
              <Route path="/issues" element={<AllIssuesPage />} />
              <Route path="/issues/:id" element={<IssueDetailPage />} />
              <Route path="/map" element={<NearbyIssuesPage />} />
              <Route path="/my-reports" element={<MyReportsPage />} />

              {/* Department Admin Routes */}
              <Route path="/department-overview" element={<DepartmentOverviewPage />} />
              <Route path="/manage-issues" element={<DepartmentOverviewPage />} />

              {/* Super Admin Routes */}
              <Route path="/admin/departments" element={<SuperAdminPage />} />
              <Route path="/admin/users" element={<SuperAdminPage />} />
              <Route path="/admin/analytics" element={<SuperAdminPage />} />

              {/* Profile & Settings */}
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
