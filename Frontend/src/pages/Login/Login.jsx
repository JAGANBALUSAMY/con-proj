import React, { useState } from 'react';
import { useAuth } from '@frontend/store/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Factory } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@frontend/services/api';

const Login = () => {
    const [employeeCode, setEmployeeCode] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                className="flex items-center justify-center min-h-screen"
                style={{ backgroundColor: '#060B14' }}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center animate-pulse">
                        <Factory size={20} className="text-white" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#4B6280' }}>
                        Connecting…
                    </p>
                </div>
            </div>
        );
    }

    if (user && user.role) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const response = await api.post('/auth/login', { employeeCode, password });
            const { user: authUser, token } = response.data;
            login(authUser, token);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputStyle = (hasError) => ({
        width: '100%',
        height: '44px',
        padding: '0 12px 0 44px',
        fontSize: '14px',
        fontFamily: 'var(--font-inter)',
        backgroundColor: '#0D1526',
        border: `1px solid ${hasError ? '#EF4444' : '#1E2D40'}`,
        borderRadius: '8px',
        color: '#E2E8F0',
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    });

    return (
        <div
            className="flex min-h-screen"
            style={{ backgroundColor: '#060B14', fontFamily: 'var(--font-inter)' }}
        >
            {/* ── Left panel: branding ── */}
            <motion.div
                className="hidden lg:flex flex-col justify-between p-12"
                style={{
                    width: '55%',
                    backgroundColor: '#060B14',
                    borderRight: '1px solid #1E2D40',
                    position: 'relative',
                    overflow: 'hidden',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                {/* Grid pattern background */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Radial glow */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        width: '600px',
                        height: '600px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
                        top: '20%',
                        left: '-10%',
                    }}
                />

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0EA5E9' }}>
                            <Factory size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                            BRIEF<span className="text-brand italic">SYNC</span>
                        </span>
                    </div>
                </div>

                {/* Center tagline */}
                <div className="relative z-10">
                    <p
                        className="text-[11px] font-bold uppercase tracking-widest mb-4"
                        style={{ color: '#0EA5E9' }}
                    >
                        Factory Management System
                    </p>
                    <h1
                        className="font-extrabold leading-tight mb-4"
                        style={{
                            fontFamily: 'var(--font-dm)',
                            fontSize: '40px',
                            color: '#E2E8F0',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        Production<br />
                        <span style={{ color: '#0EA5E9' }}>Intelligence</span><br />
                        Platform
                    </h1>
                    <p style={{ fontSize: '14px', color: '#4B6280', maxWidth: '360px', lineHeight: 1.6 }}>
                        Real-time visibility across every machine, batch, and operator —
                        engineered for the factory floor.
                    </p>
                </div>

                {/* Bottom stats */}
                <div className="relative z-10 flex items-center gap-8">
                    {[
                        { value: '99.8%', label: 'Uptime SLA' },
                        { value: '<12ms', label: 'Sync Latency' },
                        { value: '3 Roles', label: 'Access Tiers' },
                    ].map(s => (
                        <div key={s.label}>
                            <div
                                className="font-mono font-semibold text-xl"
                                style={{ color: '#E2E8F0', fontFeatureSettings: '"tnum"' }}
                            >
                                {s.value}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-bold mt-0.5" style={{ color: '#2D4060' }}>
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Right panel: login form ── */}
            <div
                className="flex-1 flex items-center justify-center p-8"
                style={{ backgroundColor: '#0A1628' }}
            >
                <motion.div
                    className="w-full"
                    style={{ maxWidth: '400px' }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
                >
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-8 lg:hidden">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0EA5E9' }}>
                            <Factory size={18} className="text-white" />
                        </div>
                        <span className="text-lg font-extrabold text-white tracking-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                            BRIEF<span style={{ color: '#0EA5E9' }} className="italic">SYNC</span>
                        </span>
                    </div>

                    <div className="mb-8">
                        <h2
                            className="font-extrabold mb-1.5"
                            style={{
                                fontFamily: 'var(--font-dm)',
                                fontSize: '26px',
                                color: '#E2E8F0',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Welcome back
                        </h2>
                        <p style={{ fontSize: '13px', color: '#4B6280' }}>
                            Access the production floor with your credentials
                        </p>
                    </div>

                    {error && (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-lg mb-5 text-[13px]"
                            style={{
                                backgroundColor: 'rgb(239 68 68 / 0.08)',
                                border: '1px solid rgb(239 68 68 / 0.25)',
                                borderLeft: '3px solid #EF4444',
                                color: '#F87171',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Employee code */}
                        <div className="mb-4">
                            <label
                                className="block mb-2 text-[11px] font-bold uppercase tracking-widest"
                                style={{ color: '#4B6280' }}
                            >
                                Employee Code
                            </label>
                            <div className="relative">
                                <User
                                    size={15}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: '#4B6280' }}
                                />
                                <input
                                    type="text"
                                    value={employeeCode}
                                    onChange={e => setEmployeeCode(e.target.value)}
                                    placeholder="e.g. EMP-0042"
                                    required
                                    autoFocus
                                    style={inputStyle(!!error)}
                                    onFocus={e => { e.target.style.borderColor = '#0EA5E9'; e.target.style.boxShadow = '0 0 0 3px rgb(14 165 233 / 0.12)'; }}
                                    onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : '#1E2D40'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-6">
                            <label
                                className="block mb-2 text-[11px] font-bold uppercase tracking-widest"
                                style={{ color: '#4B6280' }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={15}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: '#4B6280' }}
                                />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    style={{ ...inputStyle(!!error), paddingRight: '44px' }}
                                    onFocus={e => { e.target.style.borderColor = '#0EA5E9'; e.target.style.boxShadow = '0 0 0 3px rgb(14 165 233 / 0.12)'; }}
                                    onBlur={e => { e.target.style.borderColor = error ? '#EF4444' : '#1E2D40'; e.target.style.boxShadow = 'none'; }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                                    style={{ color: '#4B6280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    className="text-[11px] font-medium"
                                    style={{ color: '#0EA5E9', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Forgot password?
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={submitting || !employeeCode || !password}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-2 font-semibold"
                            style={{
                                height: '44px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                backgroundColor: '#0EA5E9',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: submitting || !employeeCode || !password ? 'not-allowed' : 'pointer',
                                opacity: submitting || !employeeCode || !password ? 0.6 : 1,
                                boxShadow: '0 4px 16px -2px rgb(14 165 233 / 0.35)',
                                transition: 'opacity 0.15s, filter 0.15s',
                            }}
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : null}
                            {submitting ? 'Authenticating…' : 'Access Console'}
                        </motion.button>
                    </form>

                    {/* Footer note */}
                    <p
                        className="mt-8 text-center text-[11px]"
                        style={{ color: '#2D4060' }}
                    >
                        Internal access only · BRIEFSYNC v2.5
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
