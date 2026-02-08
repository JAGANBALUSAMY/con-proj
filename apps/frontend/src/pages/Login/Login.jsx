import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import api from '../../utils/api';
import './Login.css';

const Login = () => {
    const [employeeCode, setEmployeeCode] = useState('');
    const [password, setPassword] = useState('');
    const { login, user, loading } = useAuth();
    const location = useLocation();

    // 1. Wait for auth to load before deciding to redirect
    if (loading) {
        return <div className="loading-screen">Loading Auth...</div>;
    }

    // 2. If already logged in with a valid role, head to dashboard
    if (user && user.role) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', {
                employeeCode,
                password
            });

            const { user, token } = response.data;
            login(user, token);
        } catch (error) {
            console.error('Login failed:', error);
            alert(error.response?.data?.error || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <h2>Factory Production System</h2>
                    <p>Please enter your credentials to continue</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-field">
                        <User size={18} />
                        <input
                            type="text"
                            placeholder="Employee Code"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-field">
                        <Lock size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login-btn">Login to Dashboard</button>
                </form>
                <div className="login-footer">
                    <p>Demo Credentials:</p>
                    <code>ADMIN001 | EMP001 | OP001</code>
                </div>
            </div>
        </div>
    );
};

export default Login;
