import React, { useState, useEffect } from 'react';
import { useAuth } from '@frontend/store/AuthContext';
import { useSocket } from '@frontend/store/SocketContext';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import api from '@frontend/services/api';
import { Play, Package, RefreshCcw, Activity } from 'lucide-react';
import { useBatches } from '@frontend/hooks/useProduction';
import StatusBadge from '@frontend/components/ui/StatusBadge';
import Button from '@frontend/components/ui/Button';
import PageHeader from '@frontend/components/ui/PageHeader';

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
                <PageHeader
                    title={`${assignedSection.replace('_', ' ')} Station`}
                    subtitle="Live Operational Channel"
                    live
                    actions={
                        <Button variant="ghost" size="sm" leftIcon={RefreshCcw} loading={isRefreshing} onClick={fetchStatus} />
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allBatches?.map(batch => (
                        <div key={batch.id} style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.45)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(14,165,233,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; }}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--bs-text-primary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontStyle: 'italic' }}>{batch.batchNumber}</h4>
                                        <p style={{ fontSize: '9px', color: 'var(--bs-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px' }}>{batch.briefTypeName}</p>
                                    </div>
                                    <StatusBadge status={batch.status} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)' }}>
                                        <p style={{ fontSize: '9px', color: 'var(--bs-text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '4px' }}>Queue Load</p>
                                        <p style={{ fontSize: '17px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{batch.totalQuantity} <span style={{ fontSize: '10px', color: 'var(--bs-text-muted)', fontStyle: 'italic', fontWeight: 700 }}>PCS</span></p>
                                    </div>
                                    <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)' }}>
                                        <p style={{ fontSize: '9px', color: 'var(--bs-text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '4px' }}>Current Protocol</p>
                                        <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--bs-brand)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{batch.currentStage.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => openWorkModal(batch)}
                                style={{ width: '100%', backgroundColor: 'var(--bs-sidebar-bg)', color: '#fff', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', border: 'none', cursor: 'pointer', transition: 'background-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-brand)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bs-sidebar-bg)'}
                            >
                                <Play size={14} fill="currentColor" />
                                {assignedSection === 'QUALITY_CHECK' ? 'Engage Inspection' : 'Log Unit Data'}
                            </button>
                        </div>
                    ))}

                    {(!allBatches || allBatches.length === 0) && (
                        <div style={{ gridColumn: '1 / -1', padding: '128px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bs-surface)', border: '2px dashed var(--bs-border)', borderRadius: '12px' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bs-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <Package size={32} style={{ color: 'var(--bs-border)' }} />
                            </div>
                            <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Channel Idle</h3>
                            <p style={{ fontSize: '10px', color: 'var(--bs-text-muted)', fontWeight: 500, textTransform: 'uppercase', marginTop: '8px' }}>Awaiting batch synchronization from command...</p>
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
