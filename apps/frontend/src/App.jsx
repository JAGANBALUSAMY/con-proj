import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardRedirect from './components/DashboardRedirect/DashboardRedirect';
import Login from './pages/Login/Login';

// ADMIN PAGES
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagersPage from './pages/admin/ManagersPage';
import AdminOperatorsPage from './pages/admin/OperatorsPage';
import ProductionOverview from './pages/admin/ProductionOverview';
import ReportsPage from './pages/admin/ReportsPage';
import SettingsPage from './pages/admin/SettingsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';

// MANAGER PAGES
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ProductionFlowPage from './pages/manager/ProductionFlowPage';
import BatchesPage from './pages/manager/BatchesPage';
import QualityPage from './pages/manager/QualityPage';
import ReworkQueuePage from './pages/manager/ReworkQueuePage';
import ManagerOperatorsPage from './pages/manager/OperatorsPage';

// OPERATOR PAGES
import OperatorDashboard from './pages/operator/OperatorDashboard';
import StationPage from './pages/operator/StationPage';
import HistoryPage from './pages/operator/HistoryPage';

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
