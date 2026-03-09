import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { Play, Package, RefreshCcw, Activity } from 'lucide-react';
import { useBatches } from '../../hooks/useProduction';
import Badge from '../../components/ui/Badge';

import WorkLogModal from './WorkLogModal';
import QCInspectionModal from './QCInspectionModal';
import ReworkLogModal from './ReworkLogModal';
import LabelingModal from './LabelingModal';
import FoldingModal from './FoldingModal';
import PackingModal from './PackingModal';

const StationPage = () => {
    const { user } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [activeBatchForModal, setActiveBatchForModal] = useState(null);

    // Modal states
    const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [isLabelingModalOpen, setIsLabelingModalOpen] = useState(false);
    const [isFoldingModalOpen, setIsFoldingModalOpen] = useState(false);
    const [isPackingModalOpen, setIsPackingModalOpen] = useState(false);

    const assignedSection = user?.sections?.[0] || 'UNASSIGNED';
    const { batches: allBatches, loading: batchesLoading, refresh: refreshBatches } = useBatches();

    const fetchStatus = async () => {
        setIsRefreshing(true);
        await refreshBatches();
        setIsRefreshing(false);
    };

    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;
        socket.on('batch:assignment_changed', refreshBatches);
        socket.on('batch:status_updated', refreshBatches);
        return () => {
            socket.off('batch:assignment_changed', refreshBatches);
            socket.off('batch:status_updated', refreshBatches);
        };
    }, [socket, refreshBatches]);

    const openWorkModal = (batch) => {
        setActiveBatchForModal(batch);
        if (assignedSection === 'QUALITY_CHECK') setIsInspectionModalOpen(true);
        else if (assignedSection === 'REWORK') setIsReworkModalOpen(true);
        else if (assignedSection === 'LABELING') setIsLabelingModalOpen(true);
        else if (assignedSection === 'FOLDING') setIsFoldingModalOpen(true);
        else if (assignedSection === 'PACKING') setIsPackingModalOpen(true);
        else setSelectedBatch(batch);
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                {assignedSection.replace('_', ' ')} Station
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                                Live Operational Channel
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchStatus}
                        className={`p-3 rounded-xl bg-background border border-border hover:border-primary/30 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allBatches?.map(batch => (
                        <div key={batch.id} className="card-saas p-0 overflow-hidden border-transparent hover:border-primary/50 transition-all group flex flex-col shadow-lg hover:shadow-primary/10">
                            <div className="p-6 space-y-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic group-hover:text-primary transition-colors">{batch.batchNumber}</h4>
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{batch.briefTypeName}</p>
                                    </div>
                                    <Badge status={batch.status} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Queue Load</p>
                                        <p className="text-lg font-black tabular-nums">{batch.totalQuantity} <span className="text-[10px] text-slate-400 italic font-bold">PCS</span></p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Current Protocol</p>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-tighter truncate">{batch.currentStage.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => openWorkModal(batch)}
                                className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all group-hover:tracking-[0.4em]"
                            >
                                <Play size={14} fill="currentColor" />
                                {assignedSection === 'QUALITY_CHECK' ? 'Engage Inspection' : 'Log Unit Data'}
                            </button>
                        </div>
                    ))}

                    {(!allBatches || allBatches.length === 0) && (
                        <div className="col-span-full py-32 flex flex-col items-center justify-center card-saas border-dashed border-2">
                            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-6">
                                <Package size={32} className="text-slate-200" />
                            </div>
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Channel Idle</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase mt-2">Awaiting batch synchronization from command...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Operational Portal Modals */}
            <WorkLogModal isOpen={!!selectedBatch} onClose={() => setSelectedBatch(null)} batch={selectedBatch} onSuccess={refreshBatches} />
            <QCInspectionModal isOpen={isInspectionModalOpen} onClose={() => setIsInspectionModalOpen(false)} batch={activeBatchForModal} onSuccess={refreshBatches} />
            <ReworkLogModal isOpen={isReworkModalOpen} onClose={() => setIsReworkModalOpen(false)} batch={activeBatchForModal} onSuccess={refreshBatches} />
            <LabelingModal isOpen={isLabelingModalOpen} onClose={() => setIsLabelingModalOpen(false)} batch={activeBatchForModal} onSuccess={refreshBatches} />
            <FoldingModal isOpen={isFoldingModalOpen} onClose={() => setIsFoldingModalOpen(false)} batch={activeBatchForModal} onSuccess={refreshBatches} />
            <PackingModal isOpen={isPackingModalOpen} onClose={() => setIsPackingModalOpen(false)} batch={activeBatchForModal} onSuccess={refreshBatches} />
        </DashboardLayout>
    );
};

export default StationPage;
