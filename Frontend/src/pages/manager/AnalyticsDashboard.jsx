import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import MetricCard from '@frontend/components/dashboard/MetricCard';
import Badge from '@frontend/components/ui/Badge';
import api from '@frontend/services/api';
import { Clock, TrendingUp, AlertTriangle, RefreshCw, Calendar, ArrowLeft, BarChart3, Users, ChevronDown } from 'lucide-react';

import { useAuth } from '@frontend/store/AuthContext';
import { SkeletonLoader, ErrorState, EmptyState } from '@frontend/components/UI/StateFeedback';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const AnalyticsDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [efficiency, setEfficiency] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;

            const [effRes, perfRes, defRes] = await Promise.all([
                api.get('/analytics/efficiency', { params }),
                api.get('/analytics/performance', { params }),
                api.get('/analytics/defects', { params })
            ]);

            // Role-based filtering
            let filteredEff = effRes.data;
            let filteredPerf = perfRes.data;
            let filteredDef = defRes.data;

            if (user?.role === 'MANAGER' && user?.sections?.[0]) {
                const managerSection = user.sections[0];
                filteredEff = filteredEff.filter(e => e.stage === managerSection);
                filteredPerf = filteredPerf.filter(p => p.stage === managerSection);
                filteredDef = filteredDef.filter(d => d.stage === managerSection || !d.stage);
            }

            setEfficiency(filteredEff);
            setPerformance(filteredPerf);
            setDefects(filteredDef);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Operational intelligence sync failed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [user?.role]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    if (loading && efficiency.length === 0) {
        return <Layout title="Computing Intelligence..."><SkeletonLoader /></Layout>;
    }

    if (error && efficiency.length === 0) {
        return <Layout title="Insight Engine"><ErrorState onRetry={fetchAnalytics} /></Layout>;
    }

    const totalProduced = performance.reduce((acc, p) => acc + (p.totalProduced || 0), 0);
    const avgEfficiency = efficiency.length > 0 ? (efficiency.reduce((acc, e) => acc + (e.avgDurationMinutes || 0), 0) / efficiency.length).toFixed(1) : 0;
    const totalDefects = defects.reduce((acc, d) => acc + (d.totalQuantity || 0), 0);

    return (
        <Layout title="Production Intelligence" systemStatus="healthy">
            <div className="space-y-8 pb-12">
                {/* 1. Analytics Header Control */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-card-dark rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50">
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Insight Engine</h2>
                            <p className="text-xs text-slate-500 font-medium">Verified throughput across factory sections</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-300" />
                            <span className="text-slate-300 text-xs">to</span>
                            <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-300" />
                        </div>
                        <button className="btn-saas bg-primary text-white flex items-center gap-2 py-2.5 px-6" onClick={fetchAnalytics}>
                            <RefreshCw size={16} /> Update
                        </button>
                    </div>
                </div>

                {/* 2. Top-level Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Unified Throughput"
                        value={totalProduced}
                        icon={TrendingUp}
                        trend="up"
                        trendValue="+12%"
                        description="Units cleared QC today"
                    />
                    <MetricCard
                        title="Avg Cycle Time"
                        value={avgEfficiency + "m"}
                        icon={Clock}
                        color="success"
                        description="Minutes per stage per batch"
                    />
                    <MetricCard
                        title="Defect Variance"
                        value={totalDefects}
                        icon={AlertTriangle}
                        color={totalDefects > 10 ? 'error' : 'secondary'}
                        description="Isolated for rework"
                    />
                </div>

                {/* 3. Visualization Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Efficiency Chart */}
                    <div className="lg:col-span-12 xl:col-span-8 card-saas p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Operational Efficiency Mapping</h3>
                                <p className="text-xs text-slate-400">Mapping stage efficiency to identify systemic anomalies</p>
                            </div>
                            <div className="p-2 bg-primary/5 rounded-lg">
                                <BarChart3 size={20} className="text-primary" />
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={efficiency} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                        contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#fff' }}
                                    />
                                    <Bar dataKey="avgDurationMinutes" name="Cycle Time" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Defect Distribution */}
                    <div className="lg:col-span-12 xl:col-span-4 card-saas p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bold text-slate-900 dark:text-white">Yield Loss Analysis</h3>
                            <AlertTriangle size={20} className="text-amber-500" />
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={defects}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="totalQuantity"
                                        nameKey="defectCode"
                                    >
                                        {defects.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Operator Leaderboard */}
                    <div className="lg:col-span-12 card-saas overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white">Human Factor Performance</h3>
                            <button className="text-[10px] font-bold text-primary flex items-center gap-1">EXPORT DATA <ChevronDown size={12} /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Sovereign Operator</th>
                                        <th className="px-6 py-4">Sectional Assignment</th>
                                        <th className="px-6 py-4">Load (In)</th>
                                        <th className="px-6 py-4">Yield (Out)</th>
                                        <th className="px-6 py-4">Efficiency Score</th>
                                        <th className="px-6 py-4 text-right">Transactions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {performance.map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-primary">
                                                        {p.operatorName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white">{p.operatorName}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono uppercase">{p.employeeCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><StatusBadge status={p.stage} /></td>
                                            <td className="px-6 py-4 font-semibold text-slate-500">{p.totalReceived}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{p.totalProduced}</td>
                                            <td className="px-6 py-4">
                                                <div className="w-full max-w-[100px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-success rounded-full"
                                                        style={{ width: `${Math.min((p.totalProduced / p.totalReceived) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-xs">{p.logCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AnalyticsDashboard;
