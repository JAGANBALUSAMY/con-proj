import React, { useState, useEffect } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import StatusBadge from '@frontend/components/ui/StatusBadge';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import api from '@frontend/services/api';
import { RefreshCcw } from 'lucide-react';

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
            render: (val) => <StatusBadge status={val} />
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Your Submission History"
                    subtitle="Personal work log and approval status tracker"
                    actions={<Button variant="ghost" size="sm" leftIcon={RefreshCcw} loading={isRefreshing} onClick={() => { setIsRefreshing(true); fetchHistory(); }} />}
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
                        emptyMessage="No historical logs recorded yet."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default HistoryPage;
