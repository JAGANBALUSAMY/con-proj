import React from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import PipelineViz from '@frontend/components/dashboard/PipelineViz';
import { Factory } from 'lucide-react';

const ProductionOverview = () => {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <Factory className="text-primary" size={24} />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Production Pipeline Overview</h2>
                </div>

                <div className="card-saas p-8">
                    <PipelineViz />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-saas p-6">
                        <h3 className="text-lg font-bold mb-4">Pipeline Metrics</h3>
                        <p className="text-sm text-slate-500">Live throughput data across all stations.</p>
                        {/* More detailed metrics could go here */}
                    </div>
                    <div className="card-saas p-6">
                        <h3 className="text-lg font-bold mb-4">BottleNeck Analysis</h3>
                        <p className="text-sm text-slate-500">Predicted delays and congestion points.</p>
                        {/* More detailed metrics could go here */}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProductionOverview;
