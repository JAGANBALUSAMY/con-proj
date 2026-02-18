import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { Users, ClipboardCheck, Factory, CheckCircle2, AlertCircle, XCircle, UserPlus, Package, Eye, ArrowRightLeft, Clock, RefreshCcw, BarChart3 } from 'lucide-react';
import CreateOperatorModal from './CreateOperatorModal';
import CreateBatchModal from './CreateBatchModal';
import MyOperatorsView from '../../components/MyOperatorsView/MyOperatorsView';
import SectionTransferModal from '../../components/SectionTransferModal/SectionTransferModal';
import TransferRequestsView from '../../components/TransferRequestsView/TransferRequestsView';
import ActionCard from '../../components/ActionCard/ActionCard';
import RoleInfoBanner from '../../components/RoleInfoBanner/RoleInfoBanner';
import ShipmentTracker from './ShipmentTracker';
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
    const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW, SHIPMENTS
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

    const handleBatchStart = async (batchId) => {
        try {
            await api.patch(`/approvals/batch/${batchId}/start`);
            fetchDashboard();
        } catch (error) {
            alert('Failed to start batch: ' + (error.response?.data?.error || 'Unknown error'));
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
                    <div className="manager-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
                            onClick={() => setActiveTab('OVERVIEW')}
                        >
                            <Factory size={18} /> Overview
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'SHIPMENTS' ? 'active' : ''}`}
                            onClick={() => setActiveTab('SHIPMENTS')}
                        >
                            <Package size={18} /> Completed
                        </button>
                    </div>
                </div>

                {activeTab === 'SHIPMENTS' ? (
                    <div className="dashboard-content-wrapper">
                        <ShipmentTracker />
                    </div>
                ) : (
                    <>

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
                            <ActionCard
                                icon={BarChart3}
                                label="Analytics"
                                onClick={() => navigate('/analytics')}
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
                                            <th>Qty (In/Out)</th>
                                            <th>Arrived</th>
                                            <th>Started</th>
                                            <th>Submitted</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dashboardData?.approvalQueue?.map(log => (
                                            <tr key={`${log.type === 'BATCH' ? 'batch' : 'log'}-${log.id}`}>
                                                <td><strong>{log.batch.batchNumber}</strong></td>
                                                <td>{log.operator.fullName}</td>
                                                <td><span className="badge-stage">{log.stage}</span></td>
                                                <td>
                                                    <span title="Qty In">{log.quantityIn}</span>
                                                    {log.quantityOut !== null && (
                                                        <> / <span className="qty-out" title="Qty Out">{log.quantityOut}</span></>
                                                    )}
                                                </td>
                                                <td className="time-col">{log.batch.updatedAt ? new Date(log.batch.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="time-col">{log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                <td className="time-col">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="actions">
                                                    {log.type === 'BATCH' ? (
                                                        <button className="btn-approve" onClick={() => handleBatchStart(log.id)}>
                                                            <CheckCircle2 size={16} /> Start Batch
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button className="btn-approve" onClick={() => handleApprove(log.id)}>
                                                                <CheckCircle2 size={16} /> Approve
                                                            </button>
                                                            <button className="btn-reject" onClick={() => handleReject(log.id)}>
                                                                <XCircle size={16} /> Reject
                                                            </button>
                                                        </>
                                                    )}
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
                                                <p className="rework-stage-badge">{rework.reworkStage}</p>
                                                <div className="rework-stats">
                                                    <span className="stat-qty total">Total: {rework.quantity}</span>
                                                    <span className="stat-qty cured">Fixed: {rework.curedQuantity}</span>
                                                    <span className="stat-qty scrapped">Scrapped: {rework.scrappedQuantity}</span>
                                                </div>
                                                <p className="rework-op">by {rework.operator.fullName}</p>
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
                    </>
                )}
            </div>
        </Layout >
    );
};

export default ManagerDashboard;
