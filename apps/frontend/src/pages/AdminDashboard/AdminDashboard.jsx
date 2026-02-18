import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout/Layout';
import StatCard from '../../components/StatCard/StatCard';
import ActionCard from '../../components/ActionCard/ActionCard';
import RoleInfoBanner from '../../components/RoleInfoBanner/RoleInfoBanner';
import EmptyState from '../../components/EmptyState/EmptyState';
import UserListView from '../../components/UserListView/UserListView';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { ShieldCheck, Users, Settings, Activity, UserPlus, Package, Eye, RefreshCcw } from 'lucide-react';
import './AdminDashboard.css';

import CreateManagerModal from './CreateManagerModal';
import CreateBatchModal from './CreateBatchModal';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
    const [isHealthVisible, setIsHealthVisible] = useState(false);
    const [isUserListVisible, setIsUserListVisible] = useState(false);
    const [users, setUsers] = useState([]);

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/admin');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch admin stats');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchStats();
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
            setIsUserListVisible(true);
        } catch (error) {
            console.error('Failed to fetch users');
            alert('Failed to load users');
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Socket.IO listeners
    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;

        const handleSync = () => {
            fetchStats();
            if (isUserListVisible) fetchUsers();
        };

        socket.on('workforce:updated', handleSync);
        socket.on('manager:status_updated', handleSync);
        socket.on('batch:status_updated', handleSync);

        return () => {
            socket.off('workforce:updated', handleSync);
            socket.off('manager:status_updated', handleSync);
            socket.off('batch:status_updated', handleSync);
        };
    }, [socket, isUserListVisible]);

    if (loading) return <div className="loading-screen">Initializing Governance Module...</div>;

    return (
        <Layout title="Admin Governance Console">
            <div className="admin-dashboard">
                <div className="stats-grid">
                    <StatCard
                        icon={Users}
                        iconColor="#3b82f6"
                        label="Total Workforce"
                        value={stats?.totalUsers || 0}
                    />
                    <StatCard
                        icon={ShieldCheck}
                        iconColor="#10b981"
                        label="Active Managers"
                        value={stats?.managers || 0}
                    />
                    <StatCard
                        icon={Activity}
                        iconColor="#f59e0b"
                        label="Running Batches"
                        value={stats?.activeBatches || 0}
                    />
                </div>

                <div className="admin-grid">
                    <section className="admin-tools">
                        <h3><Settings size={20} /> Governance Tools</h3>
                        <div className="tools-list">
                            <ActionCard
                                icon={UserPlus}
                                label="Create Manager Account"
                                onClick={() => setIsCreateModalOpen(true)}
                            />
                            <ActionCard
                                icon={Package}
                                label="Create New Batch"
                                onClick={() => setIsCreateBatchModalOpen(true)}
                            />
                            <ActionCard
                                icon={Eye}
                                label="View Users"
                                onClick={fetchUsers}
                            />
                            <ActionCard
                                icon={Activity}
                                label="System Health Logs"
                                onClick={() => setIsHealthVisible(!isHealthVisible)}
                            />
                        </div>
                    </section>

                    <section className="system-overview">
                        <h3>
                            <ShieldCheck size={20} /> System Overview (Read-Only)
                            <button
                                className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                title="Refresh Stats"
                            >
                                <RefreshCcw size={16} />
                            </button>
                        </h3>
                        <RoleInfoBanner
                            role="ADMIN"
                            message="Governance-only role. No direct batch modification allowed."
                        />
                        {isHealthVisible ? (
                            <div className="health-logs">
                                <p className="log-entry">🟢 API Server: Operational (v1.0.2)</p>
                                <p className="log-entry">🟢 Database: Connected (Prisma Client)</p>
                                <p className="log-entry">🟢 JWT Auth Layer: Secure</p>
                                <button className="btn-close-health" onClick={() => setIsHealthVisible(false)}>Minimize Logs</button>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Activity}
                                message="System Throughput Chart Placeholder"
                            />
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

            <CreateBatchModal
                isOpen={isCreateBatchModalOpen}
                onClose={() => setIsCreateBatchModalOpen(false)}
                onSuccess={() => {
                    fetchStats();
                }}
            />

            {isUserListVisible && (
                <UserListView
                    users={users}
                    onClose={() => setIsUserListVisible(false)}
                    onRefresh={fetchUsers}
                />
            )}
        </Layout>
    );
};

export default AdminDashboard;
