import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@frontend/store/AuthContext';
import { SocketProvider } from '@frontend/store/SocketContext';
import { ThemeProvider } from '@frontend/store/ThemeContext';
import ProtectedRoute from '@frontend/layouts/ProtectedRoute';
import DashboardRedirect from '@frontend/components/DashboardRedirect/DashboardRedirect';
import Login from '@frontend/pages/Login/Login';

// ADMIN PAGES
import AdminDashboard from '@frontend/pages/admin/AdminDashboard';
import ManagersPage from '@frontend/pages/admin/ManagersPage';
import AdminOperatorsPage from '@frontend/pages/admin/OperatorsPage';
import ProductionOverview from '@frontend/pages/admin/ProductionOverview';
import ReportsPage from '@frontend/pages/admin/ReportsPage';
import SettingsPage from '@frontend/pages/admin/SettingsPage';
import AnalyticsPage from '@frontend/pages/admin/AnalyticsPage';

// MANAGER PAGES
import ManagerDashboard from '@frontend/pages/manager/ManagerDashboard';
import ProductionFlowPage from '@frontend/pages/manager/ProductionFlowPage';
import BatchesPage from '@frontend/pages/manager/BatchesPage';
import QualityPage from '@frontend/pages/manager/QualityPage';
import ReworkQueuePage from '@frontend/pages/manager/ReworkQueuePage';
import ManagerOperatorsPage from '@frontend/pages/manager/OperatorsPage';

// OPERATOR PAGES
import OperatorDashboard from '@frontend/pages/operator/OperatorDashboard';
import StationPage from '@frontend/pages/operator/StationPage';
import HistoryPage from '@frontend/pages/operator/HistoryPage';

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<DashboardRedirect />} />

              {/* ADMIN ROUTES */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/managers" element={<ProtectedRoute allowedRoles={['ADMIN']}><ManagersPage /></ProtectedRoute>} />
              <Route path="/admin/operators" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminOperatorsPage /></ProtectedRoute>} />
              <Route path="/admin/production" element={<ProtectedRoute allowedRoles={['ADMIN']}><ProductionOverview /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><ReportsPage /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />

              {/* MANAGER ROUTES */}
              <Route path="/manager" element={<ProtectedRoute allowedRoles={['MANAGER']}><ManagerDashboard /></ProtectedRoute>} />
              <Route path="/manager/flow" element={<ProtectedRoute allowedRoles={['MANAGER']}><ProductionFlowPage /></ProtectedRoute>} />
              <Route path="/manager/batches" element={<ProtectedRoute allowedRoles={['MANAGER']}><BatchesPage /></ProtectedRoute>} />
              <Route path="/manager/quality" element={<ProtectedRoute allowedRoles={['MANAGER']}><QualityPage /></ProtectedRoute>} />
              <Route path="/manager/rework" element={<ProtectedRoute allowedRoles={['MANAGER']}><ReworkQueuePage /></ProtectedRoute>} />
              <Route path="/manager/team" element={<ProtectedRoute allowedRoles={['MANAGER']}><ManagerOperatorsPage /></ProtectedRoute>} />

              {/* OPERATOR ROUTES */}
              <Route path="/operator" element={<ProtectedRoute allowedRoles={['OPERATOR']}><OperatorDashboard /></ProtectedRoute>} />
              <Route path="/operator/station" element={<ProtectedRoute allowedRoles={['OPERATOR']}><StationPage /></ProtectedRoute>} />
              <Route path="/operator/history" element={<ProtectedRoute allowedRoles={['OPERATOR']}><HistoryPage /></ProtectedRoute>} />

              {/* Common / Shared */}
              <Route path="/analytics" element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}><AnalyticsPage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
