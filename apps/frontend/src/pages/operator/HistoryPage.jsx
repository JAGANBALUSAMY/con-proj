import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TableView from '../../components/tables/TableView';
import { useTable } from '../../components/tables/useTable';
import Badge from '../../components/ui/Badge';
import api from '../../utils/api';
import { History, RefreshCcw } from 'lucide-react';

const HistoryPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/dashboard/operator');
            setLogs(response.data.recentLogs || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm
    } = useTable(logs, {
        searchKeys: ['batch.batchNumber', 'stage', 'approvalStatus']
    });

    const columns = [
        {
            key: 'batch.batchNumber',
            label: 'Batch ID',
            render: (_, log) => <span className="font-bold">{log.batch.batchNumber}</span>
        },
        { key: 'stage', label: 'Processing Stage' },
        { key: 'quantityIn', label: 'Units Rec' },
        { key: 'quantityOut', label: 'Units Log' },
        {
            key: 'createdAt',
            label: 'Timestamp',
            render: (val) => new Date(val).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        },
        {
            key: 'approvalStatus',
            label: 'Manager Status',
            render: (val) => <Badge status={val} />
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <History className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Your Submission History</h2>
                    </div>
                    <button
                        onClick={() => { setIsRefreshing(true); fetchHistory(); }}
                        className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
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
                        emptyMessage="No historical logs recorded yet."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default HistoryPage;
