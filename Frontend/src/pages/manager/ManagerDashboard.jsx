import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@frontend/store/AuthContext';
import { useSocket } from '@frontend/store/SocketContext';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import api from '@frontend/services/api';
import {
    Users,
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    Package,
    RefreshCcw,
    Activity,
    History
} from 'lucide-react';

import CreateOperatorModal from './CreateOperatorModal';
import CreateBatchModal from './CreateBatchModal';
import MetricCard from '@frontend/components/dashboard/MetricCard';
import PipelineViz from '@frontend/components/dashboard/PipelineViz';
import Badge from '@frontend/components/ui/Badge';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import FactoryTimeline from '@frontend/components/dashboard/FactoryTimeline';

const ManagerDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState([]);

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            setDashboardData(response.data);
            // Mocking manager-specific timeline
            setTimelineEvents([
                { id: 1, type: 'PROD', message: 'Production Rate Spike: Section A', meta: '+15% above baseline', timestamp: '12:15 PM' },
                { id: 2, type: 'QC', message: 'Quality Hold: Batch #C882', batchId: 'C882', meta: 'Reason: Stitching deviation', timestamp: '11:50 AM' },
                { id: 3, type: 'BATCH', message: 'New Batch #D001 initiated', batchId: 'D001', timestamp: '11:20 AM' },
                { id: 4, type: 'STAGE', message: 'Batch #B990 moved to FINISHING', batchId: 'B990', timestamp: '10:45 AM' },
            ]);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const approvalQueue = useMemo(() => dashboardData?.approvalQueue || [], [dashboardData]);

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
    } = useTable(approvalQueue, {
        searchKeys: ['batch.batchNumber', 'operator.fullName', 'stage']
    });

    const columns = [
        {
            key: 'batch.batchNumber',
            label: 'Batch',
            render: (_, log) => <span className="font-bold text-slate-900 dark:text-white">{log.batch.batchNumber}</span>
        },
        { key: 'operator.fullName', label: 'Operator', render: (_, log) => log.operator.fullName },
        { key: 'stage', label: 'Stage', render: (val) => <Badge status={val} /> },
        {
            key: 'quantityIn',
            label: 'Units',
            render: (_, log) => (
                <div className="font-bold text-sm text-text-primary">
                    {log.quantityIn} {log.quantityOut !== null && <span className="text-primary italic">→ {log.quantityOut}</span>}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Arrived',
            render: (val) => <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        },
        {
            key: 'id',
            label: 'Action',
            sortable: false,
            className: 'text-right',
            render: (_, log) => (
                <div className="flex justify-end gap-2">
                    {log.type === 'BATCH' ? (
                        <button className="btn-saas bg-primary text-white text-[10px] py-1 px-3 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all" onClick={() => handleBatchStart(log.id)}>
                            START
                        </button>
                    ) : (
                        <>
                            <button className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors" onClick={() => handleApprove(log.id)}><CheckCircle2 size={16} /></button>
                            <button className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors" onClick={() => handleReject(log.id)}><XCircle size={16} /></button>
                        </>
                    )}
                </div>
            )
        }
    ];

    const pipelineStages = useMemo(() => {
        if (!dashboardData?.activeBatches) return [];
        const managerSections = user?.sections || [];
        const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];

        return stages.map(stageName => {
            const batchesInStage = dashboardData.activeBatches.filter(b => b.currentStage === stageName);
            const isManagerSection = managerSections.includes(stageName);
            const defects = batchesInStage.reduce((acc, b) => acc + (b.pendingQCQuantity > 0 ? 1 : 0), 0);

            return {
                name: stageName,
                count: batchesInStage.length,
                avgTime: '4.2m',
                defects: defects,
                status: defects > 2 ? 'error' : (batchesInStage.length > 5 ? 'delay' : 'normal'),
                highlight: isManagerSection
            };
        });
    }, [dashboardData, user?.sections]);

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 60000);
        return () => clearInterval(interval);
    }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => fetchDashboard();
        socket.on('approval:updated', handleSync);
        socket.on('batch:status_updated', handleSync);
        return () => {
            socket.off('approval:updated', handleSync);
            socket.off('batch:status_updated', handleSync);
        };
    }, [socket]);

    const handleApprove = async (logId) => {
        try { await api.patch(`/approvals/production/${logId}/approve`); fetchDashboard(); } catch (error) { console.error('Approval failed', error); }
    };

    const handleReject = async (logId) => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        try { await api.patch(`/approvals/production/${logId}/reject`, { reason }); fetchDashboard(); } catch (error) { console.error('Rejection failed', error); }
    };

    const handleBatchStart = async (batchId) => {
        try { await api.patch(`/approvals/batch/${batchId}/start`); fetchDashboard(); } catch (error) { console.error('Start failed', error); }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* 1. Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Section Active" value={dashboardData?.activeBatches?.length || 0} icon={Package} trend="up" trendValue="+2" />
                    <MetricCard title="Pending Approvals" value={dashboardData?.approvalQueue?.length || 0} icon={ClipboardCheck} color={dashboardData?.approvalQueue?.length > 5 ? 'warning' : 'primary'} />
                    <MetricCard title="Rework Backlog" value={dashboardData?.reworkQueue?.length || 0} icon={RefreshCcw} color={dashboardData?.reworkQueue?.length > 0 ? 'error' : 'success'} />
                    <MetricCard title="Managed Force" value={dashboardData?.team?.length || 0} icon={Users} />
                </div>

                {/* 2. Operational Intelligence & Station Actions */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left: Interactive Insights & Timeline */}
                    <div className="xl:col-span-8 space-y-8">
                        <section className="card-saas p-8 bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-l-primary relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Activity size={120} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Section Operational Health</h3>
                                <p className="text-sm text-slate-500 font-medium max-w-lg">
                                    Your assigned sections are currently operating at <span className="text-success font-bold">92% efficiency</span>.
                                    There are {dashboardData?.approvalQueue?.length || 0} items awaiting your signature in the Quality Office.
                                </p>
                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => window.location.href = '/manager/quality'} className="btn-saas bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] px-6 py-2.5">Open Quality Office</button>
                                    <button onClick={() => window.location.href = '/manager/flow'} className="btn-saas border border-slate-200 dark:border-slate-800 text-[10px] px-6 py-2.5">Monitor Flow</button>
                                </div>
                            </div>
                        </section>

                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6 flex items-center gap-2 uppercase tracking-tighter">
                                <History size={18} className="text-primary" />
                                Live Floor Trail
                            </h3>
                            <FactoryTimeline events={timelineEvents} loading={loading} />
                        </section>
                    </div>

                    {/* Right: Station Actions & Quick Add */}
                    <div className="xl:col-span-4 space-y-8">
                        <section className="card-saas p-6 border-t-4 border-t-primary">
                            <h3 className="font-bold text-text-primary mb-6 uppercase tracking-tighter">Command Actions</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => setShowCreateModal(true)} className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group text-left">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                        <Users className="text-slate-400 group-hover:text-primary" size={24} />
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black uppercase text-slate-500 group-hover:text-primary tracking-widest">Provision Personnel</span>
                                        <span className="text-xs font-bold text-slate-400">Add new operator to fleet</span>
                                    </div>
                                </button>
                                <button onClick={() => setShowCreateBatchModal(true)} className="p-4 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group text-left">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                        <Package className="text-slate-400 group-hover:text-primary" size={24} />
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black uppercase text-slate-500 group-hover:text-primary tracking-widest">Initiate Run</span>
                                        <span className="text-xs font-bold text-slate-400">Spawn new production batch</span>
                                    </div>
                                </button>
                            </div>
                        </section>

                        <div className="p-6 bg-slate-900 rounded-3xl text-white overflow-hidden relative group">
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Shift Intelligence</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-300">Target Output</span>
                                        <span className="text-xs font-black">2,400 Units</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-slate-300">Current Pace</span>
                                        <span className="text-xs font-black text-primary">2,180 Units</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[85%]" />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Activity size={100} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CreateOperatorModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchDashboard}
                managerSections={dashboardData?.sections || []}
            />
            <CreateBatchModal
                isOpen={showCreateBatchModal}
                onClose={() => setShowCreateBatchModal(false)}
                onSuccess={fetchDashboard}
            />
        </DashboardLayout>
    );
};

export default ManagerDashboard;
