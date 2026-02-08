import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { Play, CheckCircle, Clock, Package, AlertTriangle } from 'lucide-react';
import './OperatorDashboard.css';

const OperatorDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingBatch, setLoggingBatch] = useState(null);
    const [quantityIn, setQuantityIn] = useState('');

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/dashboard/operator');
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

    const handleLogWork = async (e) => {
        e.preventDefault();
        try {
            // NOTE: In Phase 16 we will create a dedicated production logging controller
            // For now, we simulate the submission
            alert(`Work submitted for ${loggingBatch.batchNumber}. Awaiting Manager Approval.`);
            setLoggingBatch(null);
            setQuantityIn('');
            fetchDashboard();
        } catch (error) {
            alert('Submission failed');
        }
    };

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
                        <h3><Package size={20} /> Batches at this Station</h3>
                        <div className="batch-list">
                            {dashboardData?.batches?.map(batch => (
                                <div key={batch.id} className="batch-item">
                                    <div className="batch-info">
                                        <h4>{batch.batchNumber}</h4>
                                        <p>{batch.briefTypeName} • {batch.totalQuantity} units</p>
                                    </div>
                                    <button
                                        className="btn-start"
                                        onClick={() => {
                                            setLoggingBatch(batch);
                                            setQuantityIn(batch.totalQuantity);
                                        }}
                                    >
                                        <Play size={16} /> Record Work
                                    </button>
                                </div>
                            ))}
                            {dashboardData?.batches?.length === 0 && (
                                <div className="empty-state">No batches currently at your station.</div>
                            )}
                        </div>
                    </section>

                    <aside className="activity-panel">
                        {loggingBatch ? (
                            <div className="log-form-container">
                                <h3>Record Work: {loggingBatch.batchNumber}</h3>
                                <form onSubmit={handleLogWork} className="log-form">
                                    <div className="form-group">
                                        <label>Quantity Processed</label>
                                        <input
                                            type="number"
                                            value={quantityIn}
                                            onChange={(e) => setQuantityIn(e.target.value)}
                                            max={loggingBatch.totalQuantity}
                                            required
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn-submit">Submit for Approval</button>
                                        <button type="button" className="btn-cancel" onClick={() => setLoggingBatch(null)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="history-section">
                                <h3><Clock size={20} /> Recent Submissions</h3>
                                <div className="history-list">
                                    {dashboardData?.recentLogs?.map(log => (
                                        <div key={log.id} className="history-item">
                                            <div className="history-info">
                                                <p className="batch-ref">{log.batch.batchNumber}</p>
                                                <p className="log-time">{new Date(log.createdAt).toLocaleDateString()}</p>
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
                        )}
                    </aside>
                </div>
            </div>
        </Layout>
    );
};

export default OperatorDashboard;
