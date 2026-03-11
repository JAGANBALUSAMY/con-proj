import React, { useState, useEffect } from 'react';
import { useAuth } from '@frontend/store/AuthContext';
import { useSocket } from '@frontend/store/SocketContext';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import api from '@frontend/services/api';
import { Link } from 'react-router-dom';
import {
    Package,
    CheckCircle2,
    RotateCcw,
    Activity,
    History,
    ShieldAlert,
    Zap,
    PlayCircle,
    ClipboardList
} from 'lucide-react';

import MetricCard from '@frontend/components/dashboard/MetricCard';
import StatusBadge from '@frontend/components/ui/StatusBadge';

const OperatorDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    const assignedSection = user?.sections?.[0] || 'UNASSIGNED';

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/operator');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 60000);
        return () => clearInterval(interval);
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => fetchDashboard();
        socket.on('batch:status_updated', handleSync);
        socket.on('approval:updated', handleSync);
        return () => {
            socket.off('batch:status_updated', handleSync);
            socket.off('approval:updated', handleSync);
        };
    }, [socket]);

    const unitsToday = dashboardData?.recentLogs?.reduce((acc, log) => acc + (log.quantityOut || 0), 0) || 0;
    const reworkPending = dashboardData?.batches?.filter(b => b.defectRecords?.length > 0).length || 0;
    const quotaProgress = Math.min(100, (unitsToday / 500) * 100);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Tactical Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--bs-text-primary)', letterSpacing: '-0.03em', textTransform: 'uppercase', fontStyle: 'italic' }}>
                            Personnel Index: <span style={{ color: 'var(--bs-brand)', fontWeight: 800 }}>{user?.fullName.split(' ')[0]}</span>
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', backgroundColor: 'rgba(34,197,94,0.1)', color: 'var(--bs-success)', borderRadius: '99px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--bs-success)', borderRadius: '50%', animation: 'status-pulse 2s infinite' }} />
                                Active Duty
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', borderLeft: '1px solid var(--bs-border)', paddingLeft: '12px' }}>
                                Station: <span style={{ color: 'var(--bs-text-primary)' }}>{assignedSection.replace('_', ' ')}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Performance Command Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Primary Focus: Performance Visualization */}
                    <div className="xl:col-span-8 space-y-8">
                        <section className="card-saas p-0 border-none overflow-hidden bg-slate-900 dark:bg-slate-950 text-white relative shadow-2xl shadow-primary/10 transition-transform hover:scale-[1.01]">
                            <div className="absolute top-0 right-0 p-12 opacity-10 blur-xl scale-150 rotate-12">
                                <Activity size={240} className="text-primary" />
                            </div>

                            <div className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-12">
                                <div className="flex-1 space-y-8">
                                    <div>
                                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-3">Core Performance Objective</h3>
                                        <h4 className="text-4xl font-black tracking-tighter uppercase leading-none">Shift Quota Optimization</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Threshold</p>
                                                <p className="text-2xl font-black tabular-nums">{quotaProgress.toFixed(0)}% <span className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">of shift target</span></p>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${quotaProgress >= 100 ? 'bg-success text-white' : 'bg-primary text-white'}`}>
                                                {quotaProgress >= 100 ? 'QUOTA MET' : 'OPERATIONAL'}
                                            </span>
                                        </div>
                                        <div className="h-6 bg-white/5 border border-white/10 rounded-2xl p-1 overflow-hidden">
                                            <div
                                                className={`h-full rounded-xl transition-all duration-1000 shadow-lg ${quotaProgress >= 100 ? 'bg-success' : 'bg-primary shadow-primary/50'}`}
                                                style={{ width: `${quotaProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-[200px] h-[200px] rounded-full border-8 border-white/5 flex flex-col items-center justify-center relative group">
                                    <div className="absolute inset-2 rounded-full border border-white/10 border-dashed animate-spin-slow" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Submission</p>
                                    <p className="text-6xl font-black tabular-nums group-hover:scale-110 transition-transform">{unitsToday}</p>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1 italic">Verified Units</p>
                                </div>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Link
                                to="/operator/station"
                                style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px', textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-brand)'; e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.03)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.backgroundColor = 'var(--bs-surface)'; }}
                            >
                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'var(--bs-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(14,165,233,0.35)', flexShrink: 0, transform: 'rotate(3deg)' }}>
                                    <PlayCircle size={32} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--bs-text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Active Station</h4>
                                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-brand)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Process Assigned Load Now</p>
                                </div>
                            </Link>
                            <Link
                                to="/operator/history"
                                style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px', textDecoration: 'none', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; }}
                            >
                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'var(--bs-background)', color: 'var(--bs-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: 'rotate(-3deg)' }}>
                                    <ClipboardList size={32} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--bs-text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Submission Audit</h4>
                                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Review Personal Log History</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Secondary Focus: Unit metrics & Recent activity */}
                    <div className="xl:col-span-4 space-y-8">
                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                            <h3 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bs-text-muted)', marginBottom: '16px' }}>Tactical Metrics</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <Package size={18} style={{ color: 'var(--bs-brand)' }} />
                                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>Live Load</span>
                                    </div>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{dashboardData?.batches?.length || 0}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <RotateCcw size={18} style={{ color: 'var(--bs-warning)' }} />
                                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>Rework</span>
                                    </div>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{reworkPending}</span>
                                </div>
                            </div>
                        </section>

                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    <History size={16} style={{ color: 'var(--bs-brand)' }} />
                                    Recent Activity
                                </h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {dashboardData?.recentLogs?.slice(0, 5).map(log => (
                                    <div key={log.id} style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.1s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bs-border)'}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: 'var(--bs-text-muted)' }}>
                                                {log.batch.batchNumber.slice(-2)}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bs-text-primary)' }}>{log.batch.batchNumber}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--bs-brand)', textTransform: 'uppercase' }}>{log.quantityOut} Qty</span>
                                                    <span style={{ fontSize: '9px', color: 'var(--bs-border)' }}>•</span>
                                                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--bs-text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <StatusBadge status={log.approvalStatus} size="sm" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default OperatorDashboard;
