import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        // Redirect to login but save the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Role not authorized, redirect to their home dashboard
        const roleHome = {
            'ADMIN': '/admin',
            'MANAGER': '/manager',
            'OPERATOR': '/operator'
        };
        return <Navigate to={roleHome[user.role] || '/login'} replace />;
    }

    return children;
};

export default ProtectedRoute;
