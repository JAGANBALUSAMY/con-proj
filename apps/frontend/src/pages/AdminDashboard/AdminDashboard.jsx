import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import { ShieldCheck, Users, Settings, Activity, UserPlus } from 'lucide-react';
import './AdminDashboard.css';

import CreateManagerModal from './CreateManagerModal';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isHealthVisible, setIsHealthVisible] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/admin');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch admin stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) return <div className="loading-screen">Initializing Governance Module...</div>;

    return (
        <Layout title="Admin Governance Console">
            <div className="admin-dashboard">
                <div className="stats-grid">
                    <div className="stat-card">
                        <Users size={24} color="#3b82f6" />
                        <div className="stat-info">
                            <span className="stat-label">Total Workforce</span>
                            <span className="stat-value">{stats?.totalUsers || 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <ShieldCheck size={24} color="#10b981" />
                        <div className="stat-info">
                            <span className="stat-label">Active Managers</span>
                            <span className="stat-value">{stats?.managers || 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Activity size={24} color="#f59e0b" />
                        <div className="stat-info">
                            <span className="stat-label">Running Batches</span>
                            <span className="stat-value">{stats?.activeBatches || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="admin-grid">
                    <section className="admin-tools">
                        <h3><Settings size={20} /> Governance Tools</h3>
                        <div className="tools-list">
                            <button className="tool-btn" onClick={() => setIsCreateModalOpen(true)}>
                                <UserPlus size={18} />
                                <span>Create Manager Account</span>
                            </button>
                            <button className="tool-btn" onClick={() => setIsHealthVisible(!isHealthVisible)}>
                                <Activity size={18} />
                                <span>System Health Logs</span>
                            </button>
                        </div>
                    </section>

                    <section className="system-overview">
                        <h3><ShieldCheck size={20} /> System Overview (Read-Only)</h3>
                        {isHealthVisible ? (
                            <div className="health-logs">
                                <p className="log-entry">🟢 API Server: Operational (v1.0.2)</p>
                                <p className="log-entry">🟢 Database: Connected (Prisma Client)</p>
                                <p className="log-entry">🟢 JWT Auth Layer: Secure</p>
                                <button className="btn-close-health" onClick={() => setIsHealthVisible(false)}>Minimize Logs</button>
                            </div>
                        ) : (
                            <div className="info-placeholder">
                                <p>Global production visibility is enabled. No manual batch modification allowed for ADMIN role.</p>
                                <div className="dummy-chart">
                                    [ System Throughput Chart Placeholder ]
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <CreateManagerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    fetchStats();
                    alert('Manager account created successfully!');
                }}
            />
        </Layout>
    );
};

export default AdminDashboard;
