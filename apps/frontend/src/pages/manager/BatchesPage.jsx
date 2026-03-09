import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TableView from '../../components/tables/TableView';
import { useTable } from '../../components/tables/useTable';
import Badge from '../../components/ui/Badge';
import api from '../../utils/api';
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
            render: (val) => <Badge status={val} />
        },
        {
            key: 'totalQuantity',
            label: 'Volume',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <span className="font-black tabular-nums">{val}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">PCS</span>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Deployment Status',
            render: (val) => <Badge status={val} />
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Package className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Section Batches</h2>
                    </div>
                    <button
                        onClick={() => { setIsRefreshing(true); fetchBatches(); }}
                        className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-saas p-6 border-l-4 border-l-primary">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Fleet Volume</h4>
                        <p className="text-2xl font-black tabular-nums">{batches.reduce((acc, b) => acc + (b.totalQuantity || 0), 0)} <span className="text-xs text-slate-400 font-bold uppercase">Units</span></p>
                    </div>
                    <div className="card-saas p-6 border-l-4 border-l-success">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Production Run</h4>
                        <p className="text-2xl font-black tabular-nums">{batches.length} <span className="text-xs text-slate-400 font-bold uppercase">Active Batches</span></p>
                    </div>
                    <div className="card-saas p-6 border-l-4 border-l-warning">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pending Sign-off</h4>
                        <p className="text-2xl font-black tabular-nums">{batches.filter(b => b.pendingQCQuantity > 0).length} <span className="text-xs text-slate-400 font-bold uppercase">Actions</span></p>
                    </div>
                </div>

                <section className="card-saas p-6">
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
