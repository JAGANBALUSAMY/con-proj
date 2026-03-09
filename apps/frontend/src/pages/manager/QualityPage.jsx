import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TableView from '../../components/tables/TableView';
import { useTable } from '../../components/tables/useTable';
import Badge from '../../components/ui/Badge';
import api from '../../utils/api';
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
            render: (_, log) => <span className="font-bold">{log.batch.batchNumber}</span>
        },
        { key: 'operator.fullName', label: 'Operator' },
        {
            key: 'quantityIn',
            label: 'Units',
            render: (_, log) => (
                <div className="font-bold">
                    {log.quantityIn} {log.quantityOut !== null && <span className="text-primary italic">→ {log.quantityOut}</span>}
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
                        <ClipboardCheck className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Quality Sign-off Requests</h2>
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
                        emptyMessage="No quality check requests pending."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default QualityPage;
