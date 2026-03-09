import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PipelineViz from '../../components/dashboard/PipelineViz';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { GitBranch, Activity } from 'lucide-react';

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
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <GitBranch className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Factory Production Pipeline</h2>
                    </div>
                </div>

                <section className="card-saas p-8 border-t-4 border-t-primary">
                    <div className="mb-8">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Real-Time Load Distribution</h3>
                        <p className="text-sm text-slate-500 font-medium italic">Visualization of batch volume across all production stages.</p>
                    </div>
                    <PipelineViz stages={pipelineStages} />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {user?.sections?.map(section => {
                        const stageData = pipelineStages.find(s => s.name === section);
                        return (
                            <div key={section} className="card-saas p-6 group hover:border-primary transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-primary">
                                    <Activity size={60} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Station Protocol</h3>
                                            <p className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">{section.replace('_', ' ')}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${stageData?.status === 'error' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                            {stageData?.status === 'error' ? 'CRITICAL' : 'OPTIMAL'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Current Load</span>
                                            <span className="text-2xl font-black tabular-nums">{stageData?.count || 0} <span className="text-[10px] text-slate-400 italic">Batches</span></span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase text-slate-400">QC Discrepancies</span>
                                            <span className={`text-sm font-black ${stageData?.defects > 0 ? 'text-error' : 'text-slate-500'}`}>{stageData?.defects || 0} Units</span>
                                        </div>
                                        <div className="h-1.5 bg-background border border-border rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (stageData?.count || 0) * 15)}%` }} />
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
