import React from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import PipelineViz from '@frontend/components/dashboard/PipelineViz';
import PageHeader from '@frontend/components/ui/PageHeader';
import { Factory } from 'lucide-react';

const ProductionOverview = () => {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader title="Production Pipeline Overview" subtitle="Live floor throughput and stage progression" live />

                <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '32px' }}>
                    <PipelineViz />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '12px' }}>Pipeline Metrics</h3>
                        <p style={{ fontSize: '13px', color: 'var(--bs-text-secondary)' }}>Live throughput data across all stations.</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: '12px' }}>Bottleneck Analysis</h3>
                        <p style={{ fontSize: '13px', color: 'var(--bs-text-secondary)' }}>Predicted delays and congestion points.</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProductionOverview;
