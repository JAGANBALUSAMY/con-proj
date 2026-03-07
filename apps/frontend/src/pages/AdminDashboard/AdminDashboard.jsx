import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import ActionCard from '../../components/ActionCard/ActionCard';
import UserListView from '../../components/UserListView/UserListView';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import {
    ShieldCheck,
    Users,
    Activity,
    UserPlus,
    Package,
    Eye,
    RefreshCcw,
    BarChart3,
    Server,
    Database,
    Lock
} from 'lucide-react';

import MetricCard from '../../components/UI/MetricCard';
import StatusBadge from '../../components/UI/StatusBadge';
import TableView from '../../components/UI/TableView';
import { useTable } from '../../hooks/useTable';
import CreateManagerModal from './CreateManagerModal';
import CreateBatchModal from './CreateBatchModal';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
    const [isUserListVisible, setIsUserListVisible] = useState(false);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('ACTIVE');
    const navigate = useNavigate();

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/admin');
            setStats(response.data.stats);
        } catch (error) { console.error('Stats failed'); }
        finally { setLoading(false); setIsRefreshing(false); }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
            setIsUserListVisible(true);
        } catch (error) { console.error('Users failed'); }
    };

    const tableData = useMemo(() => activeTab === 'ACTIVE' ? stats?.activeBatchList : stats?.batchHistory, [stats, activeTab]);

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm
    } = useTable(tableData || [], {
        searchKeys: ['batchNumber', 'briefTypeName', 'currentStage']
    });

    const columns = [
        { key: 'batchNumber', label: 'Batch ID', render: (val) => <span className="font-bold text-text-primary">{val}</span> },
        { key: 'briefTypeName', label: 'Configuration' },
        { key: 'currentStage', label: 'Phase', render: (val) => <StatusBadge status={val} /> },
        { key: 'totalQuantity', label: 'Quantity', render: (val) => <span className="font-semibold">{val} <span className="text-[10px] text-slate-400">pcs</span></span> },
        {
            key: 'status',
            label: 'Status',
            className: activeTab === 'ACTIVE' ? '' : 'hidden',
            render: (val) => (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${val === 'ACTIVE' ? 'bg-success/5 text-success border-success/20' : 'bg-neutral/5 text-neutral border-neutral/20'}`}>
                    {val}
                </span>
            )
        }
    ];

    useEffect(() => { fetchStats(); }, []);

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => { fetchStats(); if (isUserListVisible) fetchUsers(); };
        socket.on('workforce:updated', handleSync);
        socket.on('batch:status_updated', handleSync);
        return () => { socket.off('workforce:updated', handleSync); socket.off('batch:status_updated', handleSync); };
    }, [socket, isUserListVisible]);

    const healthMetrics = [
        { label: 'Cloud Gateway', status: 'Operational', icon: Server, color: 'text-success' },
        { label: 'Relational DB', status: 'Healthy', icon: Database, color: 'text-success' },
        { label: 'Lock Layer', status: 'Encrypted', icon: Lock, color: 'text-primary' },
    ];

    return (
        <DashboardLayout title="Governance Center" systemStatus="healthy">
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard title="Workforce" value={stats?.totalUsers || 0} icon={Users} trend="up" trendValue="+3" />
                    <MetricCard title="Managers" value={stats?.managers || 0} icon={ShieldCheck} color="success" />
                    <MetricCard title="In Production" value={stats?.activeBatches || 0} icon={Activity} color="warning" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-8">
                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6">System Health</h3>
                            <div className="space-y-4">
                                {healthMetrics.map((m) => (
                                    <div key={m.label} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                                        <div className="flex items-center gap-3">
                                            <m.icon size={16} className={m.color} />
                                            <span className="text-xs font-semibold">{m.label}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase ${m.color}`}>{m.status}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="card-saas p-6">
                            <h3 className="font-bold text-text-primary mb-6">Tools</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <ActionCard icon={UserPlus} label="New Manager" onClick={() => setIsCreateModalOpen(true)} />
                                <ActionCard icon={Package} label="New Batch" onClick={() => setIsCreateBatchModalOpen(true)} />
                                <ActionCard icon={Eye} label="Users" onClick={fetchUsers} />
                                <ActionCard icon={BarChart3} label="Analytics" onClick={() => navigate('/analytics')} />
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-8">
                        <section className="card-saas p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex bg-background p-1 rounded-xl border border-border">
                                    <button className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ACTIVE' ? 'bg-card shadow-sm text-primary' : 'text-text-secondary'}`} onClick={() => setActiveTab('ACTIVE')}>Active</button>
                                    <button className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-card shadow-sm text-primary' : 'text-text-secondary'}`} onClick={() => setActiveTab('HISTORY')}>Archived</button>
                                </div>
                                <button className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} onClick={() => { setIsRefreshing(true); fetchStats(); }}><RefreshCcw size={16} /></button>
                            </div>
                            <TableView
                                data={paginatedData}
                                columns={columns}
                                sortConfig={sortConfig}
                                requestSort={requestSort}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                loading={loading}
                                emptyMessage="No batch records found."
                            />
                        </section>
                    </div>
                </div>
            </div>
            <CreateManagerModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={fetchStats} />
            <CreateBatchModal isOpen={isCreateBatchModalOpen} onClose={() => setIsCreateBatchModalOpen(false)} onSuccess={fetchStats} />
            {isUserListVisible && <UserListView users={users} onClose={() => setIsUserListVisible(false)} onRefresh={fetchUsers} />}
        </DashboardLayout>
    );
};

export default AdminDashboard;
