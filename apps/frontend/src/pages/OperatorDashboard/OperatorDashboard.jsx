import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { Play, Clock, Package, AlertTriangle, RefreshCcw, ShieldAlert, RotateCcw } from 'lucide-react';
import LabelingModal from './LabelingModal';
import FoldingModal from './FoldingModal';
import PackingModal from './PackingModal';
import WorkLogModal from './WorkLogModal';
import QualityCheckModal from './QualityCheckModal';
import ReworkLogModal from './ReworkLogModal';
import './OperatorDashboard.css';

const OperatorDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [isLabelingModalOpen, setIsLabelingModalOpen] = useState(false);
    const [isFoldingModalOpen, setIsFoldingModalOpen] = useState(false);
    const [isPackingModalOpen, setIsPackingModalOpen] = useState(false);
    const [activeBatchForModal, setActiveBatchForModal] = useState(null);

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

    const handleReworkClick = (batch) => {
        setActiveBatchForModal(batch);
        setIsReworkModalOpen(true);
    };

    const openWorkModal = (batch) => {
        if (assignedSection === 'QUALITY_CHECK') {
            setActiveBatchForModal(batch);
            setIsQualityModalOpen(true);
        } else if (assignedSection === 'REWORK') {
            setActiveBatchForModal(batch);
            setIsReworkModalOpen(true);
        } else if (assignedSection === 'LABELING') {
            setActiveBatchForModal(batch);
            setIsLabelingModalOpen(true);
        } else if (assignedSection === 'FOLDING') {
            setActiveBatchForModal(batch);
            setIsFoldingModalOpen(true);
        } else if (assignedSection === 'PACKING') {
            setActiveBatchForModal(batch);
            setIsPackingModalOpen(true);
        } else {
            setSelectedBatch(batch); // Standard Work Log
        }
    };

    return (
        <Layout title={`Operator Station: ${assignedSection}`}>
            <div className="operator-dashboard">
                <div className="station-alert">
                    <ShieldAlert size={20} />
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
                                    <div className="batch-actions">
                                        {/* Normal Work Button */}
                                        {batch.currentStage === assignedSection && (
                                            <button
                                                className="btn-start"
                                                onClick={() => openWorkModal(batch)}
                                            >
                                                <Play size={16} />
                                                {assignedSection === 'QUALITY_CHECK' ? 'Quality Check' :
                                                    assignedSection === 'LABELING' ? 'Start Labeling' :
                                                        assignedSection === 'FOLDING' ? 'Start Folding' :
                                                            assignedSection === 'PACKING' ? 'Start Packing' : 'Log Work'}
                                            </button>
                                        )}

                                        {/* Rework Button (Side-Flow) */}
                                        {batch.defectRecords?.some(d => d.stage === assignedSection) && (
                                            <button
                                                className="btn-rework"
                                                onClick={() => handleReworkClick(batch)}
                                            >
                                                <RotateCcw size={16} /> Log Rework ({assignedSection})
                                            </button>
                                        )}
                                    </div>
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

                <QualityCheckModal
                    isOpen={isQualityModalOpen}
                    onClose={() => setIsQualityModalOpen(false)}
                    batch={activeBatchForModal}
                    onSuccess={fetchDashboard}
                />

                <ReworkLogModal
                    isOpen={isReworkModalOpen}
                    onClose={() => setIsReworkModalOpen(false)}
                    batch={activeBatchForModal}
                    onSuccess={fetchDashboard}
                />

                <LabelingModal
                    isOpen={isLabelingModalOpen}
                    onClose={() => setIsLabelingModalOpen(false)}
                    batch={activeBatchForModal}
                    onSuccess={fetchDashboard}
                />

                <FoldingModal
                    isOpen={isFoldingModalOpen}
                    onClose={() => setIsFoldingModalOpen(false)}
                    batch={activeBatchForModal}
                    onSuccess={fetchDashboard}
                />

                <PackingModal
                    isOpen={isPackingModalOpen}
                    onClose={() => setIsPackingModalOpen(false)}
                    batch={activeBatchForModal}
                    onSuccess={fetchDashboard}
                />
            </div>
        </Layout>
    );
};

export default OperatorDashboard;
