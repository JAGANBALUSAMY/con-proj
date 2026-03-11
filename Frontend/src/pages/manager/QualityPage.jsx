import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import StatusBadge from '@frontend/components/ui/StatusBadge';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import api from '@frontend/services/api';
import { ClipboardCheck, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';

const QualityPage = () => {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchQueue = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            const data = response.data.approvalQueue || [];
            setQueue(data.filter(log => log.stage === 'QUALITY_CHECK'));
        } catch (error) {
            console.error('Failed to fetch quality queue:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm
    } = useTable(queue, {
        searchKeys: ['batch.batchNumber', 'operator.fullName']
    });

    const handleApprove = async (logId) => {
        try { await api.patch(`/approvals/production/${logId}/approve`); fetchQueue(); } catch (error) { console.error('Approval failed', error); }
    };

    const handleReject = async (logId) => {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        try { await api.patch(`/approvals/production/${logId}/reject`, { reason }); fetchQueue(); } catch (error) { console.error('Rejection failed', error); }
    };

    const columns = [
        {
            key: 'batch.batchNumber',
            label: 'Batch',
            render: (_, log) => <span style={{ fontWeight: 700, color: 'var(--bs-text-primary)' }}>{log.batch.batchNumber}</span>
        },
        { key: 'operator.fullName', label: 'Operator' },
        {
            key: 'quantityIn',
            label: 'Units',
            render: (_, log) => (
                <div style={{ fontWeight: 700 }}>
                    {log.quantityIn} {log.quantityOut !== null && <span style={{ color: 'var(--bs-brand)', fontStyle: 'italic' }}>→ {log.quantityOut}</span>}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Submitted',
            render: (val) => new Date(val).toLocaleTimeString()
        },
        {
            key: 'id',
            label: 'Action',
            sortable: false,
            className: 'text-right',
            render: (_, log) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button style={{ padding: '6px', color: 'var(--bs-success)', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => handleApprove(log.id)}><CheckCircle2 size={16} /></button>
                    <button style={{ padding: '6px', color: 'var(--bs-danger)', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => handleReject(log.id)}><XCircle size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Quality Sign-off Requests"
                    subtitle="Pending production log approvals requiring your authorization"
                    actions={<Button variant="ghost" size="sm" leftIcon={RefreshCcw} loading={isRefreshing} onClick={() => { setIsRefreshing(true); fetchQueue(); }} />}
                />

                <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                    <TableView
                        data={paginatedData}
                        columns={columns}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        loading={loading}
                        emptyMessage="No quality check requests pending."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default QualityPage;
