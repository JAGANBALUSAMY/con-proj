import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import DashboardRedirect from './components/DashboardRedirect/DashboardRedirect';
import Login from './pages/Login/Login';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard/ManagerDashboard';
import AnalyticsDashboard from './pages/ManagerDashboard/AnalyticsDashboard';
import OperatorDashboard from './pages/OperatorDashboard/OperatorDashboard';

function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/" element={<DashboardRedirect />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/operator"
              element={
                <ProtectedRoute allowedRoles={['OPERATOR']}>
                  <OperatorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<DashboardRedirect />} />
          </Routes>
        </BrowserRouter>

        <style>{`
          body { margin: 0; background-color: #f1f5f9; }
          * { box-sizing: border-box; }
        `}</style>
      </AuthProvider>
    </SocketProvider>
  );
}

export default App;
