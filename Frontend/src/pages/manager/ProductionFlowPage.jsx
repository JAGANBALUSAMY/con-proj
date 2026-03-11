import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import PipelineViz from '@frontend/components/dashboard/PipelineViz';
import PageHeader from '@frontend/components/ui/PageHeader';
import api from '@frontend/services/api';
import { useAuth } from '@frontend/store/AuthContext';
import { Activity } from 'lucide-react';

const ProductionFlowPage = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/dashboard/manager');
                setDashboardData(response.data);
            } catch (error) {
                console.error('Flow fetch failed:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 60000);
        return () => clearInterval(interval);
    }, []);

    const pipelineStages = useMemo(() => {
        const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];
        const managerSections = user?.sections || [];
        const activeBatches = dashboardData?.activeBatches || [];

        return stages.map(stageName => {
            const batchesInStage = activeBatches.filter(b => b.currentStage === stageName);
            const isManagerSection = managerSections.includes(stageName);
            const defects = batchesInStage.reduce((acc, b) => acc + (b.pendingQCQuantity > 0 ? 1 : 0), 0);

            return {
                name: stageName,
                count: batchesInStage.length,
                avgTime: '4.2m',
                defects: defects,
                status: defects > 2 ? 'error' : (batchesInStage.length > 5 ? 'delay' : 'normal'),
                highlight: isManagerSection
            };
        });
    }, [dashboardData, user?.sections]);

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--bs-border)', borderTopColor: 'var(--bs-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <PageHeader
                    title="Factory Production Pipeline"
                    subtitle="Real-time batch load distribution across all production stages"
                    live
                />

                <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderTop: '4px solid var(--bs-brand)', borderRadius: '10px', padding: '32px' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--bs-text-muted)', marginBottom: '8px' }}>Real-Time Load Distribution</h3>
                        <p style={{ fontSize: '13px', color: 'var(--bs-text-secondary)', fontWeight: 500, fontStyle: 'italic' }}>Visualization of batch volume across all production stages.</p>
                    </div>
                    <PipelineViz stages={pipelineStages} />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {user?.sections?.map(section => {
                        const stageData = pipelineStages.find(s => s.name === section);
                        const isError = stageData?.status === 'error';
                        return (
                            <div key={section} style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px', position: 'relative', overflow: 'hidden', transition: 'border-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bs-brand)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bs-border)'}>
                                <div style={{ position: 'absolute', top: 0, right: 0, padding: '16px', opacity: 0.04 }}><Activity size={60} /></div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bs-text-muted)' }}>Station Protocol</h3>
                                            <p style={{ fontWeight: 800, fontSize: '18px', color: 'var(--bs-text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{section.replace('_', ' ')}</p>
                                        </div>
                                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: isError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: isError ? 'var(--bs-danger)' : 'var(--bs-success)' }}>{isError ? 'CRITICAL' : 'OPTIMAL'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bs-text-muted)' }}>Current Load</span>
                                            <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{stageData?.count || 0} <span style={{ fontSize: '10px', color: 'var(--bs-text-muted)', fontStyle: 'italic', fontWeight: 700 }}>Batches</span></span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bs-text-muted)' }}>QC Discrepancies</span>
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: (stageData?.defects || 0) > 0 ? 'var(--bs-danger)' : 'var(--bs-text-muted)' }}>{stageData?.defects || 0} Units</span>
                                        </div>
                                        <div style={{ height: '6px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)', borderRadius: '99px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', backgroundColor: 'var(--bs-brand)', width: `${Math.min(100, (stageData?.count || 0) * 15)}%`, borderRadius: '99px' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProductionFlowPage;
