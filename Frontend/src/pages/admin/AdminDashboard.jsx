import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@frontend/store/AuthContext';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import api from '@frontend/services/api';
import { useSocket } from '@frontend/store/SocketContext';
import {
    ShieldCheck,
    Users,
    Activity,
    Server,
    Database,
    Lock,
    Package,
    RefreshCcw,
    UserPlus,
    History,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Zap,
    AlertCircle
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { generateProductionReportPDF } from '@frontend/utils/exportProductionReport';
import CreateManagerModal from './CreateManagerModal';
import CreateBatchModal from './CreateBatchModal';
import MetricCard from '@frontend/components/Dashboard/MetricCard';
import MachineStatusPanel from '@frontend/components/Dashboard/MachineStatusPanel';
import FactoryTimeline from '@frontend/components/Dashboard/FactoryTimeline';
import OperatorLeaderboard from '@frontend/components/Dashboard/OperatorLeaderboard';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import Badge from "@frontend/components/UI/Badge";

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateManagerModalOpen, setIsCreateManagerModalOpen] = useState(false);
    const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
    const [viewTab, setViewTab] = useState('ACTIVE');
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [dailyReport, setDailyReport] = useState(null);
    const [recentReports, setRecentReports] = useState([]);
    const [reportLoading, setReportLoading] = useState(true);
    const [reportError, setReportError] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Chart Refs for PDF Capture
    const efficiencyRef = React.useRef(null);
    const defectsRef = React.useRef(null);
    const performanceRef = React.useRef(null);
    const trendRef = React.useRef(null);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/admin');
            setStats(response.data.stats);
            // Mocking timeline if not in backend yet
            setTimelineEvents([
                { id: 1, type: 'BATCH', message: 'Batch #B104 created in CUTTING', batchId: 'B104', timestamp: '12:01 PM' },
                { id: 2, type: 'STAGE', message: 'Batch #B102 moved to STITCHING', batchId: 'B102', timestamp: '11:45 AM' },
                { id: 3, type: 'QC', message: 'Quality Check passed: Batch #A993', batchId: 'A993', timestamp: '11:30 AM', meta: 'Inspector: J. Doe' },
                { id: 4, type: 'ALERT', message: 'Predictive Maintenance: M-01 Lubrication required', timestamp: '10:15 AM' },
            ]);
        } catch (error) {
            console.error('Stats failed', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchDailyReport = async () => {
        setReportLoading(true);
        setReportError(false);
        try {
            const [latestRes, recentRes] = await Promise.all([
                api.get('/reports/daily/latest'),
                api.get('/reports/daily/recent')
            ]);
            setDailyReport(latestRes.data);
            setRecentReports(recentRes.data);
        } catch (error) {
            if (error.response?.status !== 404) {
                setReportError(true);
            }
        } finally {
            setReportLoading(false);
        }
    };

    const handleRegenerateReport = async () => {
        setReportLoading(true);
        try {
            const response = await api.post('/ai/report', { isRegenerate: true });
            // The response.data structure from aiReportController is { report: { ... }, method: '...' }
            // However, the dashboard expects a dailyReport object which usually has reportDate and metrics.
            // Let's wrap it to match the standard dailyReport format used by the fetchDailyReport.
            const newReport = {
                reportDate: new Date().toISOString(),
                metrics: response.data.report,
                ...response.data.report // Spread for direct access too
            };
            setDailyReport(newReport);
            window.alert('Industry Intelligence successfully updated.');
        } catch (error) {
            console.error('Regeneration failed', error);
            alert('Failed to regenerate report. Please ensure AI service is running.');
        } finally {
            setReportLoading(false);
        }
    };

    const handleExportReport = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        console.log("PDF Export Clicked. dailyReport status:", !!dailyReport);
        
        if (!dailyReport) {
            window.alert('Diagnostic: No report data available to export.');
            return;
        }

        setIsExporting(true);
        window.alert('Industrial Intelligence Engine: Preparing PDF Export...');
        
        try {
            console.log("Calling generateProductionReportPDF...");
            await generateProductionReportPDF(dailyReport, {
                efficiency: efficiencyRef,
                defects: defectsRef,
                performance: trendRef
            });
        } catch (error) {
            console.error('Export Wrapper Catch:', error);
            alert(`Export failed at wrapper: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchDailyReport();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => fetchStats();
        const handleReport = (report) => setDailyReport(report);

        socket.on('batch:status_updated', handleSync);
        socket.on('daily_report_generated', handleReport);

        return () => {
            socket.off('batch:status_updated', handleSync);
            socket.off('daily_report_generated', handleReport);
        };
    }, [socket]);

    const tableData = useMemo(() =>
        viewTab === 'ACTIVE' ? stats?.activeBatchList : stats?.batchHistory,
        [stats, viewTab]);

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        pageSize
    } = useTable(tableData || [], {
        searchKeys: ['batchNumber', 'briefTypeName', 'currentStage']
    });

    const columns = [
        {
            key: 'batchNumber',
            label: 'Batch ID',
            render: (val) => <span className="font-bold text-text-primary">{val}</span>
        },
        { key: 'briefTypeName', label: 'Configuration' },
        {
            key: 'currentStage',
            label: 'Phase',
            render: (val) => <Badge status={val} />
        },
        {
            key: 'totalQuantity',
            label: 'Quantity',
            render: (val) => <span className="font-semibold">{val} <span className="text-[10px] text-slate-400">pcs</span></span>
        }
    ];

    const healthMetrics = [
        { label: 'Cloud Gateway', status: 'Operational', icon: Server, color: 'text-success' },
        { label: 'Relational DB', status: 'Healthy', icon: Database, color: 'text-success' },
        { label: 'Lock Layer', status: 'Encrypted', icon: Lock, color: 'text-primary' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* 1. Governance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Workforce"
                        value={stats?.totalUsers || 0}
                        icon={Users}
                        trend="up"
                        trendValue="+3"
                        description="Active factory personnel"
                    />
                    <MetricCard
                        title="Managers"
                        value={stats?.managers || 0}
                        icon={ShieldCheck}
                        color="success"
                        description="Security clearance active"
                    />
                    <MetricCard
                        title="Active Production"
                        value={stats?.activeBatches || 0}
                        icon={Activity}
                        color="warning"
                        description="Live floor batches"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Specialized Status & Intelligence */}
                    <div className="lg:col-span-4 space-y-8">
                        <MachineStatusPanel />

                        {/* Daily Intelligence Summary Widget */}
                        <section className="card-saas p-0 overflow-hidden border-primary/20 bg-gradient-to-br from-white to-primary/5">
                            <div className="p-5 border-b border-border flex items-center justify-between">
                                <h3 className="font-bold text-text-primary flex items-center gap-2">
                                    <Sparkles size={18} className="text-primary animate-pulse" />
                                    Daily Intelligence
                                </h3>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handleRegenerateReport}
                                        disabled={reportLoading}
                                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                                        title="Regenerate Intelligence"
                                    >
                                        <RefreshCcw size={14} className={reportLoading ? 'animate-spin' : ''} />
                                    </button>
                                    {dailyReport && (
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {new Date(dailyReport.reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-5">
                                {reportLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                        <RefreshCcw size={24} className="animate-spin text-primary/40" />
                                        <span className="text-xs font-medium text-slate-400">Loading factory synthesis...</span>
                                    </div>
                                ) : reportError ? (
                                    <div className="text-center py-6">
                                        <AlertCircle size={24} className="mx-auto text-error/40 mb-2" />
                                        <p className="text-xs text-error/60 font-medium mb-3">Intelligence Link Failed</p>
                                        <button
                                            onClick={fetchDailyReport}
                                            className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                                        >
                                            Retry Connection
                                        </button>
                                    </div>
                                ) : !dailyReport ? (
                                    <div className="text-center py-6">
                                        <Zap size={24} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-xs text-slate-400 font-medium mb-3">No report generated yet today.</p>
                                        <button className="px-4 py-2 rounded-lg bg-background border border-border text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                            Sync Automations
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* 1. Intelligence Paragraph */}
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Executive Summary</span>
                                            <p className="text-sm text-text-secondary leading-relaxed font-medium bg-white/50 p-4 rounded-xl border border-primary/10 italic">
                                                "{dailyReport.executive_summary || dailyReport.metrics?.executive_summary || dailyReport.summary}"
                                            </p>
                                        </div>

                                        {/* 2. Micro KPI Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-white border border-border shadow-sm">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-tighter">Units Processed</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-black text-text-primary">{(dailyReport.kpis?.units_processed || dailyReport.metrics?.kpis?.units_processed || 0).toLocaleString()}</span>
                                                    <TrendingUp size={12} className="text-success" />
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white border border-border shadow-sm">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-tighter">Defect Rate</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-black text-text-primary">{(dailyReport.kpis?.defect_rate || dailyReport.metrics?.kpis?.defect_rate || 0).toFixed(2)}%</span>
                                                    <AlertCircle size={12} className="text-warning" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Visual Insight Panels */}
                                        <div className="space-y-6">
                                            <div ref={efficiencyRef} className="h-[120px] w-full bg-white/30 rounded-xl p-2 border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 px-1">Stage Efficiency</span>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={dailyReport.stage_efficiency || dailyReport.metrics?.stage_efficiency || []}>
                                                        <Bar dataKey="avg_time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                        <XAxis dataKey="stage" hide />
                                                        <RechartsTooltip
                                                            contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', fontWeight: 900 }}
                                                            labelStyle={{ display: 'none' }}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div ref={defectsRef} className="h-[120px] w-full bg-white/30 rounded-xl p-2 border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 px-1">Defect Distribution</span>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={dailyReport.defect_distribution || dailyReport.metrics?.defect_distribution || []}
                                                            innerRadius={30}
                                                            outerRadius={45}
                                                            paddingAngle={5}
                                                            dataKey="count"
                                                            nameKey="defect"
                                                        >
                                                            {(dailyReport.defect_distribution || dailyReport.metrics?.defect_distribution)?.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* 4. Multi-Section Analysis */}
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                                <span className="text-[10px] font-black text-primary uppercase block mb-2">Operational Analysis</span>
                                                <p className="text-[11px] text-text-secondary leading-snug font-medium">
                                                    {dailyReport.operational_analysis || dailyReport.metrics?.operational_analysis || "Analysis pending... Click regenerate to update."}
                                                </p>
                                            </div>

                                            <div className="p-4 rounded-xl bg-error/5 border border-error/10">
                                                <span className="text-[10px] font-black text-error uppercase block mb-2">Risk Assessment</span>
                                                <p className="text-[11px] text-text-secondary leading-snug font-medium">
                                                    {dailyReport.risk_assessment || dailyReport.metrics?.risk_assessment || "Risk evaluation pending..."}
                                                </p>
                                            </div>

                                            <div className="p-4 rounded-xl bg-success/5 border border-success/10">
                                                <span className="text-[10px] font-black text-success uppercase block mb-2">Strategic Recommendations</span>
                                                <p className="text-[11px] text-text-secondary leading-snug font-medium">
                                                    {dailyReport.recommendations || dailyReport.metrics?.recommendations || "Awaiting AI strategy..."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 5. Export Action */}
                                        <button
                                            onClick={handleExportReport}
                                            disabled={isExporting}
                                            className="w-full py-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
                                        >
                                            {isExporting ? <RefreshCcw size={14} className="animate-spin" /> : <Database size={14} />}
                                            {isExporting ? 'Preparing Report...' : 'Download Intelligence PDF'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2">
                                <History size={18} className="text-primary" />
                                Live Floor Trail
                            </h3>
                            <FactoryTimeline events={timelineEvents} loading={loading} />
                        </section>

                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2">
                                <Activity size={18} className="text-primary" />
                                System Health
                            </h3>
                            <div className="space-y-4">
                                {healthMetrics.map((m) => (
                                    <div key={m.label} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                                        <div className="flex items-center gap-3">
                                            <m.icon size={16} className={m.color} />
                                            <span className="text-xs font-semibold">{m.label}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase ${m.color}`}>{m.status}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Production Oversight */}
                    <div className="lg:col-span-8 space-y-8">
                        <section className="card-saas p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex bg-background p-1 rounded-xl border border-border">
                                    <button
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewTab === 'ACTIVE' ? 'bg-card shadow-sm text-primary' : 'text-text-secondary'}`}
                                        onClick={() => setViewTab('ACTIVE')}
                                    >
                                        Active Floor
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewTab === 'HISTORY' ? 'bg-card shadow-sm text-primary' : 'text-text-secondary'}`}
                                        onClick={() => setViewTab('HISTORY')}
                                    >
                                        History
                                    </button>
                                </div>
                                <div className="p-2 rounded-full hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setIsRefreshing(true); fetchStats(); }}>
                                    <RefreshCcw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                                </div>
                            </div>

                            {/* 7-Day Production Trend Chart */}
                            <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">7-Day Production Velocity</h4>
                                        <p className="text-[10px] text-slate-400 font-medium">Units processed across verified batches</p>
                                    </div>
                                    <TrendingUp size={16} className="text-primary" />
                                </div>
                                <div className="h-[200px] w-full" ref={trendRef}>
                                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                        <AreaChart data={recentReports.map(r => ({
                                            date: new Date(r.reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                            units: r.metrics?.kpis?.units_processed || 0
                                        }))}>
                                            <defs>
                                                <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                            <YAxis hide />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px' }}
                                            />
                                            <Area type="monotone" dataKey="units" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUnits)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <TableView
                                data={paginatedData}
                                columns={columns}
                                sortConfig={sortConfig}
                                requestSort={requestSort}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                loading={loading}
                                emptyMessage="No batch records found."
                            />
                        </section>

                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6">Governance Quick Actions</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsCreateManagerModalOpen(true)}
                                    className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
                                >
                                    <UserPlus className="mx-auto text-slate-400 group-hover:text-primary mb-2" size={24} />
                                    <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary tracking-widest">Register Manager</span>
                                </button>
                                <button
                                    onClick={() => setIsCreateBatchModalOpen(true)}
                                    className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
                                >
                                    <Package className="mx-auto text-slate-400 group-hover:text-primary mb-2" size={24} />
                                    <span className="text-[10px] font-black uppercase text-slate-500 group-hover:text-primary tracking-widest">Initiate Batch</span>
                                </button>
                            </div>
                        </section>

                        <OperatorLeaderboard />
                    </div>
                </div>
            </div>

            <CreateManagerModal
                isOpen={isCreateManagerModalOpen}
                onClose={() => setIsCreateManagerModalOpen(false)}
                onSuccess={fetchStats}
            />
            <CreateBatchModal
                isOpen={isCreateBatchModalOpen}
                onClose={() => setIsCreateBatchModalOpen(false)}
                onSuccess={fetchStats}
            />
        </DashboardLayout>
    );
};

export default AdminDashboard;
