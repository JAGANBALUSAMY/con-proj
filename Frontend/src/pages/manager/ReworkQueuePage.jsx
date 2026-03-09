import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import Badge from '@frontend/components/ui/Badge';
import api from '@frontend/services/api';
import { RefreshCcw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const ReworkQueuePage = () => {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchQueue = async () => {
        try {
            const response = await api.get('/dashboard/manager');
            const data = response.data.approvalQueue || [];
            setQueue(data.filter(log => log.stage === 'REWORK'));
        } catch (error) {
            console.error('Failed to fetch rework queue:', error);
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
            render: (_, log) => <span className="font-bold">{log.batch.batchNumber}</span>
        },
        { key: 'operator.fullName', label: 'Operator' },
        {
            key: 'quantityIn',
            label: 'Units',
            render: (_, log) => (
                <div className="font-bold text-error">
                    {log.quantityIn} {log.quantityOut !== null && <span className="text-primary italic">→ {log.quantityOut}</span>}
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Sent to Rework',
            render: (val) => new Date(val).toLocaleTimeString()
        },
        {
            key: 'id',
            label: 'Action',
            sortable: false,
            className: 'text-right',
            render: (_, log) => (
                <div className="flex justify-end gap-2">
                    <button className="p-1.5 text-success hover:bg-success/10 rounded-lg" onClick={() => handleApprove(log.id)}><CheckCircle2 size={16} /></button>
                    <button className="p-1.5 text-error hover:bg-error/10 rounded-lg" onClick={() => handleReject(log.id)}><XCircle size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-error" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Rework Control Backlog</h2>
                    </div>
                    <button
                        onClick={() => { setIsRefreshing(true); fetchQueue(); }}
                        className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw size={20} className="text-slate-500" />
                    </button>
                </div>

                <section className="card-saas p-6">
                    <TableView
                        data={paginatedData}
                        columns={columns}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        loading={loading}
                        emptyMessage="Rework backlog is clear."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default ReworkQueuePage;
