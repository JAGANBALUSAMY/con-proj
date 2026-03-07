import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../utils/api';
import {
    Users,
    ClipboardCheck,
    CheckCircle2,
    AlertCircle,
    XCircle,
    UserPlus,
    Package,
    Eye,
    RefreshCcw,
    BarChart3,
    Activity
} from 'lucide-react';

import CreateOperatorModal from './CreateOperatorModal';
import CreateBatchModal from './CreateBatchModal';
import MyOperatorsView from '../../components/MyOperatorsView/MyOperatorsView';
import SectionTransferModal from '../../components/SectionTransferModal/SectionTransferModal';
import TransferRequestsView from '../../components/TransferRequestsView/TransferRequestsView';
import ActionCard from '../../components/ActionCard/ActionCard';

// New UI Components
import MetricCard from '../../components/UI/MetricCard';
import PipelineViz from '../../components/UI/PipelineViz';
import StatusBadge from '../../components/UI/StatusBadge';
import TableView from '../../components/UI/TableView';
import { useTable } from '../../hooks/useTable';

const ManagerDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
    const [isOperatorsViewVisible, setIsOperatorsViewVisible] = useState(false);
    const [operators, setOperators] = useState([]);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showPendingTransfers, setShowPendingTransfers] = useState(false);
    const [pendingTransfers, setPendingTransfers] = useState([]);
    const [sentTransfers, setSentTransfers] = useState([]);
    const [historyTransfers, setHistoryTransfers] = useState([]);
    const navigate = useNavigate();

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Table Hook Integration
    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm
    } = useTable(dashboardData?.approvalQueue || [], {
        searchKeys: ['batch.batchNumber', 'operator.fullName', 'stage']
    });

    const columns = [
        {
            key: 'batch.batchNumber',
            label: 'Batch',
            render: (_, log) => <span className="font-bold text-slate-900 dark:text-white">{log.batch.batchNumber}</span>
        },
        { key: 'operator.fullName', label: 'Operator', render: (_, log) => log.operator.fullName },
        { key: 'stage', label: 'Stage', render: (val) => <StatusBadge status={val} /> },
        {
            key: 'quantityIn',
            label: 'Units',
            render: (_, log) => (
                <div className="font-bold">
                    {log.quantityIn} {log.quantityOut !== null && <span className="text-primary italic">→ {log.quantityOut}</span>}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Arrived',
            render: (val) => <span className="text-xs text-slate-500">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        },
        {
            key: 'id',
            label: 'Action',
            sortable: false,
            className: 'text-right',
            render: (_, log) => (
                <div className="flex justify-end gap-2">
                    {log.type === 'BATCH' ? (
                        <button className="btn-saas bg-primary text-white text-[10px] py-1 px-3" onClick={() => handleBatchStart(log.id)}>
                            START
                        </button>
                    ) : (
                        <>
                            <button className="p-1.5 text-success hover:bg-success/10 rounded-lg" onClick={() => handleApprove(log.id)}><CheckCircle2 size={16} /></button>
                            <button className="p-1.5 text-error hover:bg-error/10 rounded-lg" onClick={() => handleReject(log.id)}><XCircle size={16} /></button>
                        </>
                    )}
                </div>
            )
        }
    ];

    // Memoized pipeline data
    const pipelineStages = useMemo(() => {
        if (!dashboardData?.activeBatches) return [];
        const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];
        return stages.map(stageName => {
            const batchesInStage = dashboardData.activeBatches.filter(b => b.currentStage === stageName);
            const defects = batchesInStage.reduce((acc, b) => acc + (b.pendingQCQuantity > 0 ? 1 : 0), 0);
            return {
                name: stageName,
                count: batchesInStage.length,
                avgTime: '4.2m',
                defects: defects,
                status: defects > 2 ? 'error' : (batchesInStage.length > 5 ? 'delay' : 'normal')
            };
        });
    }, [dashboardData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchDashboard();
    };

    const fetchMyOperators = async () => {
        try {
            const response = await api.get('/users/my-operators');
            setOperators(response.data);
            setIsOperatorsViewVisible(true);
        } catch (error) { console.error(error); }
    };

    const fetchPendingTransfers = async () => {
        try {
            const [pendingRes, sentRes, historyRes] = await Promise.all([
                api.get('/section-transfers/pending'),
                api.get('/section-transfers/my-requests'),
                api.get('/section-transfers/history')
            ]);
            setPendingTransfers(pendingRes.data);
            setSentTransfers(sentRes.data);
            setHistoryTransfers(historyRes.data);
            setShowPendingTransfers(true);
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchDashboard(); }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => {
            fetchDashboard();
            if (showPendingTransfers) fetchPendingTransfers();
            if (isOperatorsViewVisible) fetchMyOperators();
        };
        socket.on('approval:updated', handleSync);
        socket.on('transfer:sync_approval', handleSync);
        socket.on('batch:status_updated', handleSync);
        return () => {
            socket.off('approval:updated', handleSync);
            socket.off('transfer:sync_approval', handleSync);
            socket.off('batch:status_updated', handleSync);
        };
    }, [socket, showPendingTransfers, isOperatorsViewVisible]);

    const handleApprove = async (logId) => {
        try { await api.patch(`/approvals/production/${logId}/approve`); fetchDashboard(); } catch (error) { alert('Approval failed'); }
    };

    const handleReject = async (logId) => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        try { await api.patch(`/approvals/production/${logId}/reject`, { reason }); fetchDashboard(); } catch (error) { alert('Rejection failed'); }
    };

    const handleBatchStart = async (batchId) => {
        try { await api.patch(`/approvals/batch/${batchId}/start`); fetchDashboard(); } catch (error) { alert('Start failed'); }
    };

    return (
        <DashboardLayout title="Production Console" systemStatus="healthy">
            <div className="space-y-8">
                {/* 1. Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Active Batches" value={dashboardData?.activeBatches?.length || 0} icon={Package} trend="up" trendValue="+2" />
                    <MetricCard title="Approval Queue" value={dashboardData?.approvalQueue?.length || 0} icon={ClipboardCheck} color={dashboardData?.approvalQueue?.length > 5 ? 'warning' : 'primary'} />
                    <MetricCard title="Rework Pending" value={dashboardData?.reworkQueue?.length || 0} icon={RefreshCcw} color={dashboardData?.reworkQueue?.length > 0 ? 'error' : 'success'} />
                    <MetricCard title="Active Team" value={dashboardData?.team?.length || 0} icon={Users} />
                </div>

                {/* 2. Pipeline Visualization */}
                <PipelineViz stages={pipelineStages} />

                {/* 3. Main Operational Area */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 space-y-8">
                        {/* Approval Table */}
                        <section className="card-saas p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ClipboardCheck size={20} className="text-primary" /> Sign-off Requests
                                </h3>
                                <button className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} onClick={handleRefresh}>
                                    <RefreshCcw size={16} className="text-slate-500" />
                                </button>
                            </div>
                            <TableView
                                data={paginatedData}
                                columns={columns}
                                sortConfig={sortConfig}
                                requestSort={requestSort}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                searchPlaceholder="Search by batch or operator..."
                                emptyMessage="No sign-off requests in queue."
                                loading={loading}
                            />
                        </section>
                    </div>

                    <div className="xl:col-span-4 space-y-8">
                        <section className="card-saas p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Operations</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <ActionCard icon={UserPlus} label="New Operator" onClick={() => setShowCreateModal(true)} />
                                <ActionCard icon={Package} label="New Batch" onClick={() => setShowCreateBatchModal(true)} />
                                <ActionCard icon={Eye} label="Team View" onClick={fetchMyOperators} />
                                <ActionCard icon={BarChart3} label="Analytics" onClick={() => navigate('/analytics')} />
                            </div>
                        </section>
                    </div>
                </div>

                {/* Modals */}
                <CreateOperatorModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={fetchDashboard} managerSections={dashboardData?.sections || []} />
                <CreateBatchModal isOpen={showCreateBatchModal} onClose={() => setShowCreateBatchModal(false)} onSuccess={fetchDashboard} />
                {isOperatorsViewVisible && <MyOperatorsView operators={operators} onClose={() => setIsOperatorsViewVisible(false)} onRefresh={fetchMyOperators} />}
                <SectionTransferModal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} onSuccess={fetchDashboard} />
                {showPendingTransfers && (
                    <TransferRequestsView incoming={pendingTransfers} outgoing={sentTransfers} history={historyTransfers} onClose={() => setShowPendingTransfers(false)} onRefresh={() => { fetchPendingTransfers(); fetchDashboard(); if (isOperatorsViewVisible) fetchMyOperators(); }} />
                )}
            </div>
        </DashboardLayout>
    );
};

export default ManagerDashboard;
