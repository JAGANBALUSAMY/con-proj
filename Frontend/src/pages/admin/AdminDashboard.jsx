import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    AlertCircle,
    BarChart2,
    PieChart as PieIcon,
    TrendingUp as TrendIcon,
    Flame
} from 'lucide-react';

import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
    ComposedChart, Legend 
} from 'recharts';
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
    const [recentReports, setRecentReports] = useState([]);
    const [reportLoading, setReportLoading] = useState(true);

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

    const fetchRecentReports = async () => {
        setReportLoading(true);
        try {
            const response = await api.get('/reports/daily/recent');
            setRecentReports(response.data);
        } catch (error) {
            console.error('Failed to fetch recent reports:', error);
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchRecentReports();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => fetchStats();
        socket.on('batch:status_updated', handleSync);
        return () => {
            socket.off('batch:status_updated', handleSync);
        };
    }, [socket]);
                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2">
                                <History size={18} className="text-primary" />
                                Live Floor Trail
                            </h3>
                            <FactoryTimeline events={timelineEvents} loading={loading} />
                        </section>

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
                                <div>
                                    <div className="h-[200px] w-full">
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
