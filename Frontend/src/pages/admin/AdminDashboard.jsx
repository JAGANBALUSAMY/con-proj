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
import StatusBadge from '@frontend/components/ui/StatusBadge';
import Button from '@frontend/components/ui/Button';
import PageHeader from '@frontend/components/ui/PageHeader';
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
            render: (val) => <span style={{ fontWeight: 700, color: 'var(--bs-text-primary)' }}>{val}</span>
        },
        { key: 'briefTypeName', label: 'Configuration' },
        {
            key: 'currentStage',
            label: 'Phase',
            render: (val) => <StatusBadge status={val} />
        },
        {
            key: 'totalQuantity',
            label: 'Quantity',
            render: (val) => <span style={{ fontWeight: 600 }}>{val} <span style={{ fontSize: '10px', color: 'var(--bs-text-muted)' }}>pcs</span></span>
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
                {/* Page Header */}
                <PageHeader
                    title="Admin Dashboard"
                    subtitle={`Welcome back, ${user?.fullName || 'Administrator'} — Factory overview at a glance`}
                    live
                    actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={RefreshCcw}
                                loading={isRefreshing}
                                onClick={() => { setIsRefreshing(true); fetchStats(); }}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={UserPlus}
                                onClick={() => setIsCreateManagerModalOpen(true)}
                            >
                                Add Manager
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                leftIcon={Package}
                                onClick={() => setIsCreateBatchModalOpen(true)}
                            >
                                New Batch
                            </Button>
                        </div>
                    }
                />

                {/* 1. Governance Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Specialized Status & Intelligence */}
                    <div className="lg:col-span-4 space-y-6">
                        <MachineStatusPanel />

                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '20px' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={18} style={{ color: 'var(--bs-brand)' }} />
                                Live Floor Trail
                            </h3>
                            <FactoryTimeline events={timelineEvents} loading={loading} />
                        </section>

                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '20px' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={18} style={{ color: 'var(--bs-brand)' }} />
                                System Health
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {healthMetrics.map((m) => (
                                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <m.icon size={15} style={{ color: m.color === 'text-success' ? 'var(--bs-success)' : 'var(--bs-brand)' }} />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bs-text-secondary)' }}>{m.label}</span>
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: m.color === 'text-success' ? 'var(--bs-success)' : 'var(--bs-brand)' }}>{m.status}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Production Oversight */}
                    <div className="lg:col-span-8 space-y-6">
                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', backgroundColor: 'var(--bs-background)', padding: '4px', borderRadius: '10px', border: '1px solid var(--bs-border)' }}>
                                    <button
                                        style={{ padding: '7px 16px', fontSize: '11px', fontWeight: 700, borderRadius: '7px', border: 'none', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: viewTab === 'ACTIVE' ? 'var(--bs-surface)' : 'transparent', color: viewTab === 'ACTIVE' ? 'var(--bs-brand)' : 'var(--bs-text-muted)', boxShadow: viewTab === 'ACTIVE' ? 'var(--bs-shadow-sm)' : 'none' }}
                                        onClick={() => setViewTab('ACTIVE')}
                                    >Active Floor</button>
                                    <button
                                        style={{ padding: '7px 16px', fontSize: '11px', fontWeight: 700, borderRadius: '7px', border: 'none', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: viewTab === 'HISTORY' ? 'var(--bs-surface)' : 'transparent', color: viewTab === 'HISTORY' ? 'var(--bs-brand)' : 'var(--bs-text-muted)', boxShadow: viewTab === 'HISTORY' ? 'var(--bs-shadow-sm)' : 'none' }}
                                        onClick={() => setViewTab('HISTORY')}
                                    >History</button>
                                </div>
                                <Button variant="ghost" size="sm" leftIcon={RefreshCcw} loading={isRefreshing} onClick={() => { setIsRefreshing(true); fetchStats(); }} />
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

                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '20px' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '16px' }}>Governance Quick Actions</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <button
                                    onClick={() => setIsCreateManagerModalOpen(true)}
                                    style={{ padding: '16px', borderRadius: '10px', border: '1px dashed var(--bs-border)', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-brand)'; e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <UserPlus size={22} style={{ margin: '0 auto 8px', color: 'var(--bs-text-muted)' }} />
                                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>Register Manager</span>
                                </button>
                                <button
                                    onClick={() => setIsCreateBatchModalOpen(true)}
                                    style={{ padding: '16px', borderRadius: '10px', border: '1px dashed var(--bs-border)', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-brand)'; e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <Package size={22} style={{ margin: '0 auto 8px', color: 'var(--bs-text-muted)' }} />
                                    <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>Initiate Batch</span>
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
