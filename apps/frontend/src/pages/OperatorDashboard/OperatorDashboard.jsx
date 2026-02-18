import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { Play, Clock, Package, AlertTriangle, RefreshCcw } from 'lucide-react';
import WorkLogModal from './WorkLogModal';
import './OperatorDashboard.css';

const OperatorDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/operator');
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

    useEffect(() => {
        fetchDashboard();
    }, []);

    // Socket.IO listeners
    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;

        const handleBatchUpdate = () => {
            // Re-fetch to ensure single source of truth from DB
            fetchDashboard();
        };

        socket.on('batch:assignment_changed', handleBatchUpdate);
        socket.on('batch:status_updated', handleBatchUpdate);

        return () => {
            socket.off('batch:assignment_changed', handleBatchUpdate);
            socket.off('batch:status_updated', handleBatchUpdate);
        };
    }, [socket]);

    if (loading) return <div className="loading-screen">Waking up Station...</div>;

    const assignedSection = user?.sections?.[0] || 'UNASSIGNED';

    return (
        <Layout title={`Operator Station: ${assignedSection}`}>
            <div className="operator-dashboard">
                <div className="station-alert">
                    <AlertTriangle size={20} />
                    <span>All work recorded here requires Manager approval before the batch can proceed.</span>
                </div>

                <div className="dashboard-grid">
                    <section className="active-batches">
                        <h3>
                            <Package size={20} /> Batches at this Station
                            <button
                                className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                title="Refresh Batches"
                            >
                                <RefreshCcw size={16} />
                            </button>
                        </h3>
                        <div className="batch-list">
                            {dashboardData?.batches?.map(batch => (
                                <div key={batch.id} className="batch-item">
                                    <div className="batch-info">
                                        <h4>{batch.batchNumber}</h4>
                                        <p>{batch.briefTypeName} • {batch.totalQuantity} units</p>
                                        <span className={`batch-status ${batch.status.toLowerCase()}`}>
                                            {batch.status}
                                        </span>
                                    </div>
                                    <button
                                        className="btn-start"
                                        onClick={() => setSelectedBatch(batch)}
                                    >
                                        <Play size={16} /> Log Work
                                    </button>
                                </div>
                            ))}
                            {dashboardData?.batches?.length === 0 && (
                                <div className="empty-state">No batches currently at your station.</div>
                            )}
                        </div>
                    </section>

                    <aside className="activity-panel">
                        <div className="history-section">
                            <h3><Clock size={20} /> Recent Submissions</h3>
                            <div className="history-list">
                                {dashboardData?.recentLogs?.map(log => (
                                    <div key={log.id} className="history-item">
                                        <div className="history-info">
                                            <p className="batch-ref">{log.batch.batchNumber}</p>
                                            <p className="log-time">
                                                {new Date(log.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`approval-badge ${log.approvalStatus.toLowerCase()}`}>
                                            {log.approvalStatus}
                                        </span>
                                    </div>
                                ))}
                                {dashboardData?.recentLogs?.length === 0 && (
                                    <p className="empty-msg">No recent activity.</p>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>

                <WorkLogModal
                    isOpen={!!selectedBatch}
                    onClose={() => setSelectedBatch(null)}
                    batch={selectedBatch}
                    onSuccess={fetchDashboard}
                />
            </div>
        </Layout>
    );
};

export default OperatorDashboard;
