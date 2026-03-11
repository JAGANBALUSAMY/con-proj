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
import StatusBadge from '@frontend/components/ui/StatusBadge';
import Button from '@frontend/components/ui/Button';
import PageHeader from '@frontend/components/ui/PageHeader';
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
            render: (_, log) => <span style={{ fontWeight: 700, color: 'var(--bs-text-primary)' }}>{log.batch.batchNumber}</span>
        },
        { key: 'operator.fullName', label: 'Operator', render: (_, log) => log.operator.fullName },
        { key: 'stage', label: 'Stage', render: (val) => <StatusBadge status={val} /> },
        {
            key: 'quantityIn',
            label: 'Units',
            render: (_, log) => (
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--bs-text-primary)' }}>
                    {log.quantityIn} {log.quantityOut !== null && <span style={{ color: 'var(--bs-brand)', fontStyle: 'italic' }}>→ {log.quantityOut}</span>}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Arrived',
            render: (val) => <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase' }}>{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        },
        {
            key: 'id',
            label: 'Action',
            sortable: false,
            className: 'text-right',
            render: (_, log) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {log.type === 'BATCH' ? (
                        <Button variant="primary" size="sm" onClick={() => handleBatchStart(log.id)}>START</Button>
                    ) : (
                        <>
                            <button style={{ padding: '6px', color: 'var(--bs-success)', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => handleApprove(log.id)}><CheckCircle2 size={16} /></button>
                            <button style={{ padding: '6px', color: 'var(--bs-danger)', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => handleReject(log.id)}><XCircle size={16} /></button>
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
                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderLeft: '4px solid var(--bs-brand)', borderRadius: '10px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '32px', opacity: 0.04 }}>
                                <Activity size={120} />
                            </div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--bs-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Section Operational Health</h3>
                                <p style={{ fontSize: '13px', color: 'var(--bs-text-secondary)', fontWeight: 500, maxWidth: '440px', lineHeight: 1.6 }}>
                                    Your assigned sections are currently operating at <span style={{ color: 'var(--bs-success)', fontWeight: 700 }}>92% efficiency</span>.
                                    There are {dashboardData?.approvalQueue?.length || 0} items awaiting your signature in the Quality Office.
                                </p>
                                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                                    <Button variant="primary" size="sm" onClick={() => window.location.href = '/manager/quality'}>Open Quality Office</Button>
                                    <Button variant="secondary" size="sm" onClick={() => window.location.href = '/manager/flow'}>Monitor Flow</Button>
                                </div>
                            </div>
                        </section>

                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                <History size={18} style={{ color: 'var(--bs-brand)' }} />
                                Live Floor Trail
                            </h3>
                            <FactoryTimeline events={timelineEvents} loading={loading} />
                        </section>
                    </div>

                    {/* Right: Station Actions & Quick Add */}
                    <div className="xl:col-span-4 space-y-8">
                        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderTop: '4px solid var(--bs-brand)', borderRadius: '10px', padding: '24px' }}>
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Command Actions</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button onClick={() => setShowCreateModal(true)} style={{ padding: '16px', borderRadius: '10px', border: '1px dashed var(--bs-border)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-brand)'; e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Users size={22} style={{ color: 'var(--bs-text-muted)' }} /></div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>Provision Personnel</span>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--bs-text-secondary)', marginTop: '2px' }}>Add new operator to fleet</span>
                                    </div>
                                </button>
                                <button onClick={() => setShowCreateBatchModal(true)} style={{ padding: '16px', borderRadius: '10px', border: '1px dashed var(--bs-border)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-brand)'; e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.04)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={22} style={{ color: 'var(--bs-text-muted)' }} /></div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>Initiate Run</span>
                                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--bs-text-secondary)', marginTop: '2px' }}>Spawn new production batch</span>
                                    </div>
                                </button>
                            </div>
                        </section>

                        <div style={{ padding: '24px', backgroundColor: 'var(--bs-sidebar-bg)', borderRadius: '12px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h4 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(148,163,184,0.8)', marginBottom: '16px' }}>Shift Intelligence</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(203,213,225,0.9)' }}>Target Output</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800 }}>2,400 Units</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(203,213,225,0.9)' }}>Current Pace</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--bs-brand)' }}>2,180 Units</span>
                                    </div>
                                    <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', backgroundColor: 'var(--bs-brand)', width: '85%', borderRadius: '99px' }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ position: 'absolute', bottom: '-16px', right: '-16px', opacity: 0.07 }}><Activity size={90} /></div>
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
