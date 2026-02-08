import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { Users, ClipboardCheck, Factory, CheckCircle2, AlertCircle, XCircle, UserPlus } from 'lucide-react';
import CreateOperatorModal from './CreateOperatorModal';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const handleApprove = async (logId) => {
        try {
            await api.patch(`/approvals/production/${logId}/approve`);
            fetchDashboard(); // Refresh
        } catch (error) {
            alert('Approval failed: ' + (error.response?.data?.error || 'Unknown error'));
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
                <div className="dashboard-header">
                    <button className="btn-create-operator" onClick={() => setShowCreateModal(true)}>
                        <UserPlus size={18} /> Create New Operator
                    </button>
                </div>
                <div className="stats-grid">
                    <div className="stat-card">
                        <Users size={24} color="#3b82f6" />
                        <div className="stat-info">
                            <span className="stat-label">My Team</span>
                            <span className="stat-value">{dashboardData?.team?.length || 0} Operators</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <ClipboardCheck size={24} color="#10b981" />
                        <div className="stat-info">
                            <span className="stat-label">Pending Approvals</span>
                            <span className="stat-value">{dashboardData?.approvalQueue?.length || 0} tasks</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Factory size={24} color="#8b5cf6" />
                        <div className="stat-info">
                            <span className="stat-label">Active Sections</span>
                            <span className="stat-value">{user?.sections?.join(', ')}</span>
                        </div>
                    </div>
                </div>

                <section className="approval-section">
                    <h3><CheckCircle2 size={20} /> Production Approval Queue</h3>
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

                    <section className="team-overview">
                        <h3><Users size={18} /> My Operators</h3>
                        <div className="team-list">
                            {dashboardData?.team?.map(op => (
                                <div key={op.id} className="team-member">
                                    <div className="member-info">
                                        <p className="member-name">{op.fullName}</p>
                                        <p className="member-code">{op.employeeCode}</p>
                                    </div>
                                    <div className="member-actions">
                                        <span className={`verify-status ${op.verificationStatus.toLowerCase()}`}>
                                            {op.verificationStatus}
                                        </span>
                                        {op.verificationStatus === 'PENDING' && (
                                            <button
                                                className="btn-verify"
                                                onClick={() => handleVerify(op.id)}
                                            >
                                                <CheckCircle2 size={14} /> Verify
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <CreateOperatorModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={fetchDashboard}
                />
            </div>
        </Layout>
    );
};

export default ManagerDashboard;
