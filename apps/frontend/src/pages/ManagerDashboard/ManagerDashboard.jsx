import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { Users, ClipboardCheck, Factory, CheckCircle2, AlertCircle, XCircle, UserPlus, Package, Eye, ArrowRightLeft, Clock, RefreshCcw } from 'lucide-react';
import CreateOperatorModal from './CreateOperatorModal';
import CreateBatchModal from './CreateBatchModal';
import MyOperatorsView from '../../components/MyOperatorsView/MyOperatorsView';
import SectionTransferModal from '../../components/SectionTransferModal/SectionTransferModal';
import TransferRequestsView from '../../components/TransferRequestsView/TransferRequestsView';
import ActionCard from '../../components/ActionCard/ActionCard';
import RoleInfoBanner from '../../components/RoleInfoBanner/RoleInfoBanner';
import './ManagerDashboard.css';

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

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchDashboard();
    };

    const fetchMyOperators = async () => {
        try {
            const response = await api.get('/users/my-operators');
            setOperators(response.data);
            setIsOperatorsViewVisible(true);
        } catch (error) {
            console.error('Failed to fetch operators');
            alert('Failed to load operators');
        }
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
        } catch (error) {
            console.error('Failed to fetch transfers');
            alert('Failed to load transfers');
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    // Socket.IO listeners
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
        try {
            await api.patch(`/approvals/production/${logId}/approve`);
            fetchDashboard(); // Refresh
        } catch (error) {
            alert('Approval failed: ' + (error.response?.data?.error || 'Unknown error'));
        }
    };

    const handleReworkApprove = async (reworkId) => {
        try {
            await api.patch(`/approvals/rework/${reworkId}/approve`);
            fetchDashboard();
        } catch (error) {
            alert('Rework approval failed: ' + (error.response?.data?.error || 'Unknown error'));
        }
    };

    const handleReworkReject = async (reworkId) => {
        const reason = prompt('Please enter rejection reason:');
        if (!reason) return;
        try {
            await api.patch(`/approvals/rework/${reworkId}/reject`, { reason });
            fetchDashboard();
        } catch (error) {
            alert('Rework rejection failed: ' + (error.response?.data?.error || 'Unknown error'));
        }
    };

    const handleReject = async (logId) => {
        const reason = prompt('Please enter rejection reason:');
        if (!reason) return;
        try {
            await api.patch(`/approvals/production/${logId}/reject`, { reason });
            fetchDashboard(); // Refresh
        } catch (error) {
            alert('Rejection failed');
        }
    };

    const handleVerify = async (operatorId) => {
        try {
            await api.patch(`/users/${operatorId}/verify`);
            alert('Operator verified successfully! They can now log in.');
            fetchDashboard(); // Refresh team list
        } catch (error) {
            alert('Verification failed: ' + (error.response?.data?.error || 'Unknown error'));
        }
    };

    if (loading) return <div className="loading-screen">Loading Supervisor Console...</div>;

    return (
        <Layout title="Manager Production Hub">
            <div className="manager-dashboard">
                <div className="dashboard-top-section">
                    <RoleInfoBanner
                        role="MANAGER"
                        message={`You are managing: ${user?.sections?.join(', ') || 'No sections assigned'}`}
                    />
                </div>

                <div className="dashboard-actions-grid">
                    <ActionCard
                        icon={UserPlus}
                        label="Create Operator"
                        onClick={() => setShowCreateModal(true)}
                    />
                    <ActionCard
                        icon={Package}
                        label="Create Batch"
                        onClick={() => setShowCreateBatchModal(true)}
                    />
                    <ActionCard
                        icon={Eye}
                        label="My Operators"
                        onClick={fetchMyOperators}
                    />
                    <ActionCard
                        icon={ArrowRightLeft}
                        label="Transfer Operator"
                        onClick={() => setShowTransferModal(true)}
                    />
                    <ActionCard
                        icon={Clock}
                        label={`Transfers ${pendingTransfers.length > 0 ? `(${pendingTransfers.length})` : ''}`}
                        onClick={fetchPendingTransfers}
                    />
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon team">
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">My Team</span>
                            <span className="stat-value">{dashboardData?.team?.length || 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon approval">
                            <ClipboardCheck size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Queue</span>
                            <span className="stat-value">{dashboardData?.approvalQueue?.length || 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon rework">
                            <AlertCircle size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Reworks</span>
                            <span className="stat-value">{dashboardData?.reworkQueue?.length || 0}</span>
                        </div>
                    </div>
                </div>

                <section className="approval-section">
                    <h3>
                        <CheckCircle2 size={20} /> Production Approval Queue
                        <button
                            className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            title="Refresh Queue"
                        >
                            <RefreshCcw size={16} />
                        </button>
                    </h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Batch</th>
                                    <th>Operator</th>
                                    <th>Stage</th>
                                    <th>Qty In</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData?.approvalQueue?.map(log => (
                                    <tr key={log.id}>
                                        <td><strong>{log.batch.batchNumber}</strong></td>
                                        <td>{log.operator.fullName}</td>
                                        <td><span className="badge-stage">{log.stage}</span></td>
                                        <td>{log.quantityIn}</td>
                                        <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                                        <td className="actions">
                                            <button className="btn-approve" onClick={() => handleApprove(log.id)}>
                                                <CheckCircle2 size={16} /> Approve
                                            </button>
                                            <button className="btn-reject" onClick={() => handleReject(log.id)}>
                                                <XCircle size={16} /> Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(dashboardData?.approvalQueue?.length === 0) && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                            No pending approvals. Your workspace is clear!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="overview-layout">
                    <section className="active-batches">
                        <h3><Factory size={18} /> Section Throughput</h3>
                        <div className="batch-grid">
                            {dashboardData?.activeBatches?.map(batch => (
                                <div key={batch.id} className="batch-mini-card">
                                    <div className="batch-header">
                                        <span className="batch-no">{batch.batchNumber}</span>
                                        <span className={`status-tag ${batch.status.toLowerCase()}`}>{batch.status}</span>
                                    </div>
                                    <p className="batch-brief">{batch.briefTypeName}</p>
                                    <div className="batch-footer">
                                        <span className="current-stage">{batch.currentStage}</span>
                                        <span className="qty">{batch.totalQuantity} units</span>
                                    </div>
                                </div>
                            ))}
                            {dashboardData?.activeBatches?.length === 0 && (
                                <p className="empty-msg">No active batches in your sections.</p>
                            )}
                        </div>
                    </section>

                    <section className="rework-overview">
                        <h3><AlertCircle size={18} /> Rework Queue</h3>
                        <div className="rework-list">
                            {dashboardData?.reworkQueue?.map(rework => (
                                <div key={rework.id} className="rework-item">
                                    <div className="rework-info">
                                        <p className="rework-batch">{rework.batch.batchNumber}</p>
                                        <p className="rework-op">{rework.operator.fullName}</p>
                                    </div>
                                    <div className="rework-actions">
                                        <button className="btn-approve-sm" onClick={() => handleReworkApprove(rework.id)}>
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <button className="btn-reject-sm" onClick={() => handleReworkReject(rework.id)}>
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {dashboardData?.reworkQueue?.length === 0 && (
                                <p className="empty-msg-sm">No reworks pending.</p>
                            )}
                        </div>
                    </section>
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

                {isOperatorsViewVisible && (
                    <MyOperatorsView
                        operators={operators}
                        onClose={() => setIsOperatorsViewVisible(false)}
                        onRefresh={fetchMyOperators}
                    />
                )}

                <SectionTransferModal
                    isOpen={showTransferModal}
                    onClose={() => setShowTransferModal(false)}
                    onSuccess={fetchDashboard}
                />

                {showPendingTransfers && (
                    <TransferRequestsView
                        incoming={pendingTransfers}
                        outgoing={sentTransfers}
                        history={historyTransfers}
                        onClose={() => setShowPendingTransfers(false)}
                        onRefresh={() => {
                            fetchPendingTransfers();
                            fetchDashboard();
                            if (isOperatorsViewVisible) fetchMyOperators();
                        }}
                    />
                )}
            </div>
        </Layout >
    );
};

export default ManagerDashboard;
