import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import MetricCard from '@frontend/components/Dashboard/MetricCard';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import StatusBadge from '@frontend/components/ui/StatusBadge';
import api from '@frontend/services/api';
import { Clock, TrendingUp, AlertTriangle, RefreshCw, Calendar, ArrowLeft, BarChart3, ChevronDown, Activity, Target, Layers } from 'lucide-react';
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
            let filteredEff = effRes.data || [];
            let filteredPerf = perfRes.data || [];
            let filteredDef = defRes.data || [];

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

    const totalProduced = performance.reduce((acc, p) => acc + (p.totalProduced || 0), 0);
    const avgEfficiency = efficiency.length > 0 ? (efficiency.reduce((acc, e) => acc + (e.avgDurationMinutes || 0), 0) / efficiency.length).toFixed(1) : 0;
    const totalDefects = defects.reduce((acc, d) => acc + (d.totalQuantity || 0), 0);

    return (
        <DashboardLayout>
            <div className="space-y-8 pb-12">
                <PageHeader
                    title="Production Intelligence"
                    subtitle="Insight engine for sectional yield"
                    actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bs-background)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--bs-border)' }}>
                                <Calendar size={14} style={{ color: 'var(--bs-text-muted)' }} />
                                <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} style={{ backgroundColor: 'transparent', fontSize: '12px', fontWeight: 700, outline: 'none', color: 'var(--bs-text-primary)', border: 'none' }} />
                                <span style={{ color: 'var(--bs-text-muted)', fontSize: '12px', fontWeight: 700 }}>to</span>
                                <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} style={{ backgroundColor: 'transparent', fontSize: '12px', fontWeight: 700, outline: 'none', color: 'var(--bs-text-primary)', border: 'none' }} />
                            </div>
                            <Button variant="primary" size="sm" leftIcon={RefreshCw} loading={loading} onClick={fetchAnalytics}>Sync</Button>
                        </div>
                    }
                />

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

                {/* 3. Visualization Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Chart 1: Stage Cycle Time */}
                    <div className="lg:col-span-12 xl:col-span-8" style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Stage Cycle Time</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Avg minutes per stage per batch</p>
                            </div>
                            <div className="p-3 bg-primary/10 rounded-xl"><BarChart3 size={20} className="text-primary" /></div>
                        </div>
                        {efficiency.length === 0 ? (
                            <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No efficiency data available</div>
                        ) : (
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={efficiency} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                                        <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} unit="m" />
                                        <Tooltip cursor={{ fill: 'rgba(59,130,246,0.05)' }} contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                        <Bar dataKey="avgDurationMinutes" name="Avg Cycle (min)" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                                        <Bar dataKey="logCount" name="Log Count" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={36} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Chart 2: Defect Distribution Pie */}
                    <div className="lg:col-span-12 xl:col-span-4" style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Yield Loss by Defect</h3>
                            <AlertTriangle size={20} className="text-amber-500" />
                        </div>
                        {defects.length === 0 ? (
                            <div className="h-[280px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No defect data available</div>
                        ) : (
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={defects} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="totalQuantity" nameKey="defectCode">
                                            {defects.map((_, index) => (
                                                <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Chart 3: Stage Throughput — Input vs Output */}
                    <div className="lg:col-span-12 xl:col-span-7" style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Stage Throughput</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Units received vs produced per stage</p>
                            </div>
                            <div className="p-3 bg-success/10 rounded-xl"><Layers size={20} className="text-success" /></div>
                        </div>
                        {performance.length === 0 ? (
                            <div className="h-[280px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No throughput data available</div>
                        ) : (
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.values(performance.reduce((acc, p) => {
                                            if (!acc[p.stage]) acc[p.stage] = { stage: p.stage, received: 0, produced: 0 };
                                            acc[p.stage].received += p.totalReceived;
                                            acc[p.stage].produced += p.totalProduced;
                                            return acc;
                                        }, {}))}
                                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                                        <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                                        <Bar dataKey="received" name="Received" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                                        <Bar dataKey="produced" name="Produced" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Chart 4: Defect Occurrence Bar */}
                    <div className="lg:col-span-12 xl:col-span-5" style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Defect Occurrence Rate</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Frequency per defect code</p>
                            </div>
                            <div className="p-3 bg-error/10 rounded-xl"><Target size={20} className="text-error" /></div>
                        </div>
                        {defects.length === 0 ? (
                            <div className="h-[280px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No defect occurrences</div>
                        ) : (
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={defects} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                        <YAxis type="category" dataKey="defectCode" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} width={80} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                        <Bar dataKey="occurrenceCount" name="Occurrences" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={20} />
                                        <Bar dataKey="totalQuantity" name="Qty Affected" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Chart 5: Operator Yield Rate Area Chart */}
                    <div className="lg:col-span-12" style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Operator Yield Rate</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Output efficiency % per operator</p>
                            </div>
                            <div className="p-3 bg-warning/10 rounded-xl"><Activity size={20} className="text-warning" /></div>
                        </div>
                        {performance.length === 0 ? (
                            <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No operator data available</div>
                        ) : (
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={performance.map(p => ({
                                            name: p.employeeCode,
                                            yieldRate: p.totalReceived > 0 ? parseFloat(((p.totalProduced / p.totalReceived) * 100).toFixed(1)) : 0,
                                            output: p.totalProduced
                                        }))}
                                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} unit="%" domain={[0, 100]} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                        <Area type="monotone" dataKey="yieldRate" name="Yield Rate" stroke="#f59e0b" strokeWidth={2} fill="url(#yieldGradient)" dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Operator Leaderboard */}
                    <div className="lg:col-span-12" style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '13px' }}>Precision Performance Ranking</h3>
                            <button style={{ fontSize: '10px', fontWeight: 800, color: 'var(--bs-brand)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>EXPORT CSV <ChevronDown size={12} /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bs-background)', fontSize: '10px', fontWeight: 800, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        <th style={{ padding: '12px 20px' }}>Sovereign Operator</th>
                                        <th style={{ padding: '12px 20px' }}>Sectional Assignment</th>
                                        <th style={{ padding: '12px 20px' }}>Load (In)</th>
                                        <th style={{ padding: '12px 20px' }}>Yield (Out)</th>
                                        <th style={{ padding: '12px 20px' }}>Efficiency Score</th>
                                        <th style={{ padding: '12px 20px', textAlign: 'right' }}>Records</th>
                                    </tr>
                                </thead>
                                <tbody style={{ borderTop: '1px solid var(--bs-border)' }}>
                                    {(performance || []).map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--bs-border)', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-background)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--bs-brand)', border: '1px solid rgba(14,165,233,0.2)', textTransform: 'uppercase' }}>
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
