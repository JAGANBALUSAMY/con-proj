import React, { useState } from 'react';
import { useAuth } from '@frontend/store/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@frontend/services/api';
import './Login.css';

const Login = () => {
    const [employeeCode, setEmployeeCode] = useState('');
    const [password, setPassword] = useState('');
    const { login, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="loading-screen">Loading Auth...</div>;
    }

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
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="login-card"
            >
                <div className="login-header">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="text-primary" size={28} />
                    </div>
                    <h2>Factory Console</h2>
                    <p>Enter your credentials to access the production floor</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
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
                    </div>
                    <button type="submit" className="login-btn">
                        Initialize Session
                    </button>
                </form>
                <div className="login-footer">
                    <p>System Access Protocol</p>
                    <code>SECURE-CHANNEL-v2.0</code>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
