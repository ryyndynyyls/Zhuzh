import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { injectGlobalKeyframes } from './styles/animations';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { BudgetPage } from './pages/BudgetPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { TimesheetPage } from './pages/TimesheetPage';
import { LoginPage } from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import { ResourceCalendarPage } from './pages/ResourceCalendarPage';
import { ReportsPage } from './pages/ReportsPage';
import { TeamPage } from './pages/TeamPage';
import { ArchiveManagementPage } from './pages/admin/ArchiveManagementPage';
import BudgetProjectPage from './pages/BudgetProjectPage';
import { MarketingPage } from './pages/MarketingPage';

export default function App() {
  // Inject animation keyframes on mount
  useEffect(() => {
    injectGlobalKeyframes();
  }, []);

  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/welcome" element={<MarketingPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/budget/:projectId" element={<BudgetProjectPage />} />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute requiredRole={['pm', 'admin']}>
                    <ApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/timesheet" element={<TimesheetPage />} />
              <Route path="/timesheet/:weekStart" element={<TimesheetPage />} />
              <Route path="/resources" element={<ResourceCalendarPage />} />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredRole={['pm', 'admin']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route
                path="/projects/:projectId/settings"
                element={
                  <ProtectedRoute requiredRole={['pm', 'admin']}>
                    <ProjectSettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/archives"
                element={
                  <ProtectedRoute requiredRole={['admin']}>
                    <ArchiveManagementPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
