import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DashboardRedirect = () => {
    const { user, loading } = useAuth();
    console.log('DashboardRedirect: Rendering', { user, loading });

    if (loading) {
        return <div>Loading Workspace...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role-based routing logic
    switch (user.role) {
        case 'ADMIN':
            return <Navigate to="/admin" replace />;
        case 'MANAGER':
            return <Navigate to="/manager" replace />;
        case 'OPERATOR':
            return <Navigate to="/operator" replace />;
        default:
            // If user exists but role is unknown, do NOT redirect back to login
            // as it will cause an infinite loop. Show error instead.
            return <div className="error-screen">Unknown Role: {user.role}. Please contact Admin.</div>;
    }
};

export default DashboardRedirect;
