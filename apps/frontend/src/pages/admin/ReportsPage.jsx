import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TableView from '../../components/tables/TableView';
import { useTable } from '../../components/tables/useTable';
import api from '../../utils/api';
import { FileText, Download } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';
import Badge from '../../components/ui/Badge';

const ReportsPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/dashboard/admin');
            const history = response.data.stats.batchHistory || [];
            setData(history);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, []);

    const columns = [
        { key: 'batchNumber', label: 'Batch ID', render: (val) => <span className="font-bold">{val}</span> },
        { key: 'briefTypeName', label: 'Configuration' },
        { key: 'currentStage', label: 'Last Phase', render: (val) => <Badge status={val} /> },
        { key: 'totalQuantity', label: 'Quantity' },
        { key: 'updatedAt', label: 'Completed Date', render: (val) => new Date(val).toLocaleDateString() }
    ];

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm
    } = useTable(data, {
        searchKeys: ['batchNumber', 'briefTypeName']
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <FileText className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Production Reports</h2>
                    </div>
                    <button
                        onClick={() => exportToCSV(data, columns, `production_audit_${new Date().toISOString().split('T')[0]}`)}
                        className="btn-saas bg-primary text-white flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-primary/20"
                    >
                        <Download size={16} />
                        Export Audit Log
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
                        emptyMessage="No audit records available."
                    />
                </section>
            </div>
        </DashboardLayout>
    );
};

export default ReportsPage;
