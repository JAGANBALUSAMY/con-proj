import React, { useState, useEffect } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import StatusBadge from '@frontend/components/ui/StatusBadge';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import api from '@frontend/services/api';
import { Package, RefreshCcw } from 'lucide-react';

const BatchesPage = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchBatches = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            setBatches(response.data.activeBatches || []);
        } catch (error) {
            console.error('Failed to fetch batches:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, []);

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        pageSize
    } = useTable(batches, {
        searchKeys: ['batchNumber', 'briefTypeName', 'currentStage']
    });

    const columns = [
        {
            key: 'batchNumber',
            label: 'Batch Protocol',
            render: (val) => (
                <div className="flex flex-col">
                    <span className="font-black text-slate-900 dark:text-white tracking-widest uppercase text-sm">{val}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Section Assigned</span>
                </div>
            )
        },
        {
            key: 'briefTypeName',
            label: 'Blueprint',
            render: (val) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{val}</span>
        },
        {
            key: 'currentStage',
            label: 'Jurisdiction',
            render: (val) => <StatusBadge status={val} />
        },
        {
            key: 'totalQuantity',
            label: 'Volume',
            render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800 }}>{val}</span>
                    <span style={{ fontSize: '9px', color: 'var(--bs-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>PCS</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Deployment Status',
            render: (val) => <StatusBadge status={val} />
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <PageHeader
                    title="Active Section Batches"
                    subtitle="All batches currently assigned to your managed sections"
                    actions={<Button variant="ghost" size="sm" leftIcon={RefreshCcw} loading={isRefreshing} onClick={() => { setIsRefreshing(true); fetchBatches(); }} />}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderLeft: '4px solid var(--bs-brand)', borderRadius: '10px', padding: '24px' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bs-text-muted)', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Fleet Volume</h4>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{batches.reduce((acc, b) => acc + (b.totalQuantity || 0), 0)} <span style={{ fontSize: '11px', color: 'var(--bs-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Units</span></p>
                    </div>
                    <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderLeft: '4px solid var(--bs-success)', borderRadius: '10px', padding: '24px' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bs-text-muted)', letterSpacing: '0.08em', marginBottom: '4px' }}>Production Run</h4>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{batches.length} <span style={{ fontSize: '11px', color: 'var(--bs-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Batches</span></p>
                    </div>
                    <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderLeft: '4px solid var(--bs-warning)', borderRadius: '10px', padding: '24px' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--bs-text-muted)', letterSpacing: '0.08em', marginBottom: '4px' }}>Pending Sign-off</h4>
                        <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--bs-text-primary)' }}>{batches.filter(b => b.pendingQCQuantity > 0).length} <span style={{ fontSize: '11px', color: 'var(--bs-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Actions</span></p>
                    </div>
                </div>

                <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                    <TableView
                        data={paginatedData}
                        columns={columns}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        loading={loading}
                        searchPlaceholder="Filter by batch ID or blueprint..."
                        emptyMessage="No active batches found in your assigned sections."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default BatchesPage;
