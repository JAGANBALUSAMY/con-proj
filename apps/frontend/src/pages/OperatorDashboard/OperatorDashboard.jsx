import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Layout from '../../components/Layout/Layout';
import api from '../../utils/api';
import {
    Play,
    Clock,
    Package,
    RefreshCcw,
    ShieldAlert,
    RotateCcw,
    CheckCircle2,
    AlertTriangle,
    History,
    Activity
} from 'lucide-react';

import LabelingModal from './LabelingModal';
import FoldingModal from './FoldingModal';
import PackingModal from './PackingModal';
import WorkLogModal from './WorkLogModal';
import QualityCheckModal from './QualityCheckModal';
import ReworkLogModal from './ReworkLogModal';

import MetricCard from '../../components/UI/MetricCard';
import StatusBadge from '../../components/UI/StatusBadge';

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

    const assignedSection = user?.sections?.[0] || 'UNASSIGNED';

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

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        const handleSync = () => fetchDashboard();

        // Comprehensive Real-Time Sync Layer
        socket.on('batch:assignment_changed', handleSync);
        socket.on('batch:status_updated', handleSync);
        socket.on('approval:updated', handleSync);
        socket.on('rework:updated', handleSync);

        return () => {
            socket.off('batch:assignment_changed', handleSync);
            socket.off('batch:status_updated', handleSync);
            socket.off('approval:updated', handleSync);
            socket.off('rework:updated', handleSync);
        };
    }, [socket]);

    const handleReworkClick = (batch) => {
        setActiveBatchForModal(batch);
        setIsReworkModalOpen(true);
    };

    const openWorkModal = (batch) => {
        setActiveBatchForModal(batch);
        if (assignedSection === 'QUALITY_CHECK') setIsQualityModalOpen(true);
        else if (assignedSection === 'REWORK') setIsReworkModalOpen(true);
        else if (assignedSection === 'LABELING') setIsLabelingModalOpen(true);
        else if (assignedSection === 'FOLDING') setIsFoldingModalOpen(true);
        else if (assignedSection === 'PACKING') setIsPackingModalOpen(true);
        else setSelectedBatch(batch);
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark text-primary font-bold">Syncing Station Data...</div>;

    return (
        <Layout title={`${assignedSection} Station`} systemStatus="healthy">
            <div className="space-y-8 pb-12">
                {/* 1. Quick Info Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Active Batches"
                        value={dashboardData?.batches?.length || 0}
                        icon={Package}
                        description="Assigned to your station"
                    />
                    <MetricCard
                        title="Today's Units"
                        value={dashboardData?.recentLogs?.reduce((acc, log) => acc + (log.quantityOut || 0), 0) || 0}
                        icon={CheckCircle2}
                        color="success"
                        description="Successfully processed"
                    />
                    <MetricCard
                        title="Revisions Needed"
                        value={dashboardData?.batches?.filter(b => b.defectRecords?.length > 0).length || 0}
                        icon={RotateCcw}
                        color="warning"
                        description="Items requiring rework"
                    />
                </div>

                {/* 2. Main Workspace */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left: Interactive Batch Cards */}
                    <div className="xl:col-span-8">
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Activity size={20} className="text-primary" />
                                    Active Assignments
                                </h3>
                                <button
                                    className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                >
                                    <RefreshCcw size={18} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {dashboardData?.batches?.map(batch => (
                                    <div key={batch.id} className="card-saas p-6 group hover:border-primary/50 transition-all border-l-4 border-l-primary/30">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{batch.batchNumber}</h4>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">{batch.briefTypeName}</p>
                                            </div>
                                            <StatusBadge status={batch.status} />
                                        </div>

                                        <div className="flex items-center gap-6 mb-6">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Target Qty</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">{batch.totalQuantity}</p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Stage</p>
                                                <p className="text-sm font-semibold text-primary">{batch.currentStage.replace('_', ' ')}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {batch.currentStage === assignedSection && (
                                                <button
                                                    className="flex-1 btn-saas bg-primary text-white flex items-center justify-center gap-2 py-2.5 shadow-lg shadow-primary/20 hover:scale-[1.02]"
                                                    onClick={() => openWorkModal(batch)}
                                                >
                                                    <Play size={16} />
                                                    {assignedSection === 'QUALITY_CHECK' ? 'Quality Check' : 'Record Progress'}
                                                </button>
                                            )}

                                            {batch.defectRecords?.some(d => assignedSection === 'REWORK' ? ['CUTTING', 'STITCHING'].includes(d.reworkStage) : d.reworkStage === assignedSection) && (
                                                <button
                                                    className="px-4 border-2 border-warning text-warning rounded-xl hover:bg-warning/10 transition-colors flex items-center justify-center"
                                                    onClick={() => handleReworkClick(batch)}
                                                    title="Log Rework"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {dashboardData?.batches?.length === 0 && (
                                    <div className="lg:col-span-2 p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500 font-medium">No active batches assigned to your station.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right: History & Feedback */}
                    <div className="xl:col-span-4 space-y-8">
                        <section className="card-saas p-6 h-fit">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <History size={20} className="text-primary" />
                                Recent Activity
                            </h3>
                            <div className="space-y-4">
                                {dashboardData?.recentLogs?.map(log => (
                                    <div key={log.id} className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{log.batch.batchNumber}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleDateString()} • {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <StatusBadge status={log.approvalStatus} />
                                    </div>
                                ))}
                                {dashboardData?.recentLogs?.length === 0 && (
                                    <p className="text-center py-6 text-xs text-slate-400 italic">No recent log submissions.</p>
                                )}
                            </div>
                        </section>

                        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4">
                            <ShieldAlert className="text-primary shrink-0" size={24} />
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Station Security</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    All data entries are immutable and require manager verification for session completion.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <WorkLogModal isOpen={!!selectedBatch} onClose={() => setSelectedBatch(null)} batch={selectedBatch} onSuccess={fetchDashboard} />
                <QualityCheckModal isOpen={isQualityModalOpen} onClose={() => setIsQualityModalOpen(false)} batch={activeBatchForModal} onSuccess={fetchDashboard} />
                <ReworkLogModal isOpen={isReworkModalOpen} onClose={() => setIsReworkModalOpen(false)} batch={activeBatchForModal} onSuccess={fetchDashboard} />
                <LabelingModal isOpen={isLabelingModalOpen} onClose={() => setIsLabelingModalOpen(false)} batch={activeBatchForModal} onSuccess={fetchDashboard} />
                <FoldingModal isOpen={isFoldingModalOpen} onClose={() => setIsFoldingModalOpen(false)} batch={activeBatchForModal} onSuccess={fetchDashboard} />
                <PackingModal isOpen={isPackingModalOpen} onClose={() => setIsPackingModalOpen(false)} batch={activeBatchForModal} onSuccess={fetchDashboard} />
            </div>
        </Layout>
    );
};

export default OperatorDashboard;
