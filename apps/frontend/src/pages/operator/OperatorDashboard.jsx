import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
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

import MetricCard from '../../components/dashboard/MetricCard';
import Badge from '../../components/ui/Badge';

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
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            Personnel Index: <span className="text-primary font-black">{user?.fullName.split(' ')[0]}</span>
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-success/10 text-success rounded-full text-[9px] font-black uppercase tracking-widest border border-success/20">
                                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                                Active Duty
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 dark:border-slate-800 pl-3">
                                Station: <span className="text-slate-900 dark:text-white">{assignedSection.replace('_', ' ')}</span>
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
                                className="card-saas p-8 flex items-center gap-6 hover:border-primary border-transparent group transition-all bg-primary/5 shadow-lg shadow-primary/5 group"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-105 transition-all rotate-3 group-hover:rotate-0">
                                    <PlayCircle size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Station</h4>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">Process Assigned Load Now</p>
                                </div>
                            </Link>
                            <Link
                                to="/operator/history"
                                className="card-saas p-8 flex items-center gap-6 hover:border-slate-400 border-transparent group transition-all"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center group-hover:bg-slate-200 transition-colors -rotate-3 group-hover:rotate-0">
                                    <ClipboardList size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Submission Audit</h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Review Personal Log History</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Secondary Focus: Unit metrics & Recent activity */}
                    <div className="xl:col-span-4 space-y-8">
                        <section className="card-saas p-6 space-y-6">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Tactical Metrics</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 rounded-2xl bg-background border border-border">
                                    <div className="flex items-center gap-3">
                                        <Package className="text-primary" size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Load</span>
                                    </div>
                                    <span className="text-xl font-black">{dashboardData?.batches?.length || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-2xl bg-background border border-border">
                                    <div className="flex items-center gap-3">
                                        <RotateCcw className="text-warning" size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Rework</span>
                                    </div>
                                    <span className="text-xl font-black">{reworkPending}</span>
                                </div>
                            </div>
                        </section>

                        <section className="card-saas p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-text-primary flex items-center gap-2 uppercase tracking-tighter">
                                    <History size={18} className="text-primary" />
                                    Recent Activity
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {dashboardData?.recentLogs?.slice(0, 5).map(log => (
                                    <div key={log.id} className="p-3 rounded-xl bg-background border border-border flex justify-between items-center group hover:border-primary/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-400">
                                                {log.batch.batchNumber.slice(-2)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-text-primary tracking-tight">{log.batch.batchNumber}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-primary uppercase">{log.quantityOut} Qty</span>
                                                    <span className="text-[9px] text-slate-300">•</span>
                                                    <span className="text-[9px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge status={log.approvalStatus} />
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
