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
    History
} from 'lucide-react';

import MetricCard from '@frontend/components/dashboard/MetricCard';
import Badge from '@frontend/components/ui/Badge';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import MachineStatusPanel from '@frontend/components/dashboard/MachineStatusPanel';
import OperatorLeaderboard from '@frontend/components/dashboard/OperatorLeaderboard';
import FactoryTimeline from '@frontend/components/dashboard/FactoryTimeline';
import CreateManagerModal from './CreateManagerModal';
import CreateBatchModal from './CreateBatchModal';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateManagerModalOpen, setIsCreateManagerModalOpen] = useState(false);
    const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
    const [viewTab, setViewTab] = useState('ACTIVE');
    const [timelineEvents, setTimelineEvents] = useState([]);

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

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => fetchStats();
        socket.on('batch:status_updated', handleSync);
        return () => socket.off('batch:status_updated', handleSync);
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
                                <button
                                    className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                                    onClick={() => { setIsRefreshing(true); fetchStats(); }}
                                >
                                    <RefreshCcw size={16} />
                                </button>
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
