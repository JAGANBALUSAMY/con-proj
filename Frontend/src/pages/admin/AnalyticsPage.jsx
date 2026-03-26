import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, 
    ComposedChart, Line 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import MetricCard from '@frontend/components/dashboard/MetricCard';
import Badge from '@frontend/components/ui/Badge';
import api from '@frontend/services/api';
import { 
    Clock, TrendingUp, AlertTriangle, RefreshCw, Calendar, 
    ArrowLeft, BarChart3, ChevronDown, Flame, Sparkles, Zap,
    BarChart2, PieChart as PieIcon
} from 'lucide-react';

import { useAuth } from '@frontend/store/AuthContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const AnalyticsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [efficiency, setEfficiency] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [dailyReport, setDailyReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(true);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        setReportLoading(true);
        try {
            const params = {};
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;

            // Fetch main analytics and AI report in parallel
            const [effRes, perfRes, defRes, reportRes] = await Promise.allSettled([
                api.get('/analytics/efficiency', { params }),
                api.get('/analytics/performance', { params }),
                api.get('/analytics/defects', { params }),
                api.get('/reports/daily/latest')
            ]);

            // Role-based filtering logic
            let rawEff = effRes.status === 'fulfilled' ? (effRes.value.data || []) : [];
            let rawPerf = perfRes.status === 'fulfilled' ? (perfRes.value.data || []) : [];
            let rawDef = defRes.status === 'fulfilled' ? (defRes.value.data || []) : [];

            if (user?.role === 'MANAGER' && user?.sections?.[0]) {
                const managerSection = user.sections[0];
                rawEff = rawEff.filter(e => e.stage === managerSection);
                rawPerf = rawPerf.filter(p => p.stage === managerSection);
                rawDef = rawDef.filter(d => d.stage === managerSection || !d.stage);
            }

            setEfficiency(rawEff);
            setPerformance(rawPerf);
            setDefects(rawDef);

            // Handle report result (safe — never blocks main analytics on failure)
            if (reportRes.status === 'fulfilled') {
                try {
                    const reportData = reportRes.value.data;
                    if (reportData && reportData.metrics) {
                        const metrics = typeof reportData.metrics === 'string'
                            ? JSON.parse(reportData.metrics)
                            : reportData.metrics;
                        setDailyReport(metrics);
                    }
                } catch (parseErr) {
                    console.warn('Could not parse AI report data:', parseErr);
                }
            } else {
                // 404 (no reports yet) or 500 (server error) — silently ignore
                console.warn('AI Report not available:', reportRes.reason?.response?.status === 404 ? 'No report generated yet' : 'Server error');
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('Operational intelligence sync failed.');
        } finally {
            setLoading(false);
            setReportLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [user?.role]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const totalProduced = performance.reduce((acc, p) => acc + (p.totalProduced || 0), 0);
    const avgEfficiency = efficiency.length > 0 ? (efficiency.reduce((acc, e) => acc + (e.avgDurationMinutes || 0), 0) / efficiency.length).toFixed(1) : 0;
    const totalDefects = defects.reduce((acc, d) => acc + (d.totalQuantity || 0), 0);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-12">
                {/* 1. Analytics Header Control */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50">
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Production Intelligence</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Insight engine for sectional yield</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                            <Calendar size={16} className="text-slate-400" />
                            <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-300" />
                            <span className="text-slate-300 text-xs font-bold">to</span>
                            <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="bg-transparent text-xs font-bold outline-none text-slate-700 dark:text-slate-300" />
                        </div>
                        <button className="btn-saas bg-primary text-white flex items-center gap-2 py-2.5 px-6 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all" onClick={fetchAnalytics}>
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            <span className="text-xs font-black tracking-widest uppercase">Sync</span>
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
                        color={totalDefects > 10 ? 'error' : 'warning'}
                        description="Isolated for evaluation"
                    />
                </div>

                {/* 3. AI-Enhanced Intelligence Synthesis (V10 Expansion) */}
                {dailyReport && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                            <Sparkles size={20} className="text-primary animate-pulse" />
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">AI-Enhanced Intelligence Synthesis</h3>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* 1. Factory Throughput Trend */}
                            <div className="card-saas p-6 border-primary/10 bg-gradient-to-br from-white to-primary/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Throughput Velocity Projection</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Daily industrial processing volume</p>
                                    </div>
                                    <TrendingUp size={18} className="text-primary" />
                                </div>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dailyReport.throughput_trend || dailyReport.metrics?.throughput_trend || []}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px' }} />
                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 2. Stage Bottleneck Heatmap */}
                            <div className="card-saas p-6 border-error/10 bg-gradient-to-br from-white to-error/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Manufacturing Bottleneck Heatmap</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-stage delay factor analysis</p>
                                    </div>
                                    <Flame size={18} className="text-error" />
                                </div>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={dailyReport.bottleneck_heatmap || dailyReport.metrics?.bottleneck_heatmap || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                            <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                                            <Bar dataKey="delay_factor" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.6} />
                                            <Line type="monotone" dataKey="delay_factor" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 3. Operator Efficiency Ranking */}
                            <div className="card-saas p-6 border-success/10 bg-gradient-to-br from-white to-success/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Precision Efficiency Ranking</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personnel performance benchmarking</p>
                                    </div>
                                    <Zap size={18} className="text-success" />
                                </div>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={dailyReport.operator_efficiency || dailyReport.metrics?.operator_efficiency || []} margin={{ left: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={80} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                                            <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                                                {dailyReport.operator_efficiency?.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : '#10b981'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 4. Defect Root Cause Chart */}
                            <div className="card-saas p-6 border-warning/10 bg-gradient-to-br from-white to-warning/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Yield Root Cause Attribution</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Categorical breakdown of quality loss</p>
                                    </div>
                                    <PieIcon size={18} className="text-warning" />
                                </div>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dailyReport.defect_root_causes || dailyReport.metrics?.defect_root_causes || []}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="percentage"
                                                nameKey="cause"
                                            >
                                                {dailyReport.defect_root_causes?.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '10px' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 700 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Native Operational Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Efficiency Chart */}
                    <div className="lg:col-span-12 xl:col-span-8 card-saas p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Operational Efficiency Mapping</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Mapping stage efficiency anomalies</p>
                            </div>
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <BarChart3 size={20} className="text-primary" />
                            </div>
                        </div>
                        <div className="h-[350px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%" debounce={100}>
                                <BarChart data={efficiency} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" strokeOpacity={0.2} />
                                    <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                        contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '16px', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#60A5FA', fontWeight: 900, fontSize: '10px' }}
                                    />
                                    <Bar dataKey="avgDurationMinutes" name="Cycle Time" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Defect Distribution */}
                    <div className="lg:col-span-12 xl:col-span-4 card-saas p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Yield Loss Analysis</h3>
                            <AlertTriangle size={20} className="text-amber-500" />
                        </div>
                        <div className="h-[300px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%" debounce={100}>
                                <PieChart>
                                    <Pie
                                        data={defects}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={8}
                                        dataKey="totalQuantity"
                                        nameKey="defectCode"
                                    >
                                        {defects.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Operator Leaderboard */}
                    <div className="lg:col-span-12 card-saas overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Precision Performance Ranking</h3>
                            <button className="text-[10px] font-black text-primary flex items-center gap-1 uppercase tracking-widest hover:underline">EXPORT CSV <ChevronDown size={12} /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="px-6 py-4">Sovereign Operator</th>
                                        <th className="px-6 py-4">Sectional Assignment</th>
                                        <th className="px-6 py-4">Load (In)</th>
                                        <th className="px-6 py-4">Yield (Out)</th>
                                        <th className="px-6 py-4">Efficiency Score</th>
                                        <th className="px-6 py-4 text-right">Records</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(performance || []).map((p, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 uppercase">
                                                        {p.operatorName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">{p.operatorName}</div>
                                                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{p.employeeCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><Badge status={p.stage} /></td>
                                            <td className="px-6 py-4 font-bold text-slate-500">{p.totalReceived}</td>
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{p.totalProduced}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 max-w-[80px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full"
                                                            style={{ width: `${Math.min((p.totalProduced / p.totalReceived) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400">
                                                        {((p.totalProduced / p.totalReceived) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-400 text-xs tracking-tighter">{p.logCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;
