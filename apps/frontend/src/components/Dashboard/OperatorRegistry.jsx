import React from 'react';
import TableView from '../tables/TableView';
import { useTable } from '../tables/useTable';
import Badge from '../ui/Badge';
import { Users, Wrench, ShieldAlert, ExternalLink, Calendar } from 'lucide-react';

const OperatorRegistry = ({ operators, loading, onRefresh, onManage, title = "Operational Force", subtitle = "Direct labor tracking and station assignment monitoring" }) => {
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
    } = useTable(operators, {
        searchKeys: ['fullName', 'employeeCode', 'sections']
    });

    const columns = [
        {
            key: 'fullName',
            label: 'Shift Workforce',
            render: (val, user) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black border border-emerald-500/20 uppercase">
                        {val.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{val}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{user.employeeCode}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'sections',
            label: 'Current Station',
            render: (sections) => (
                <div className="flex flex-wrap gap-1">
                    {(sections || []).length > 0 ? (
                        sections.map(s => <Badge key={s} status={s} />)
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase italic tracking-widest leading-tight">Float</span>
                    )}
                </div>
            )
        },
        {
            key: 'efficiency',
            label: 'Performance Yield',
            sortable: false,
            render: (_) => (
                <div className="w-[120px] space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Efficiency</span>
                        <span className="text-emerald-500">92%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: '92%' }} />
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Availability',
            render: (status) => (
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-success' : 'bg-slate-400'} pulse-animation`} />
                        {status === 'active' && <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-success animate-ping opacity-75" />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest italic leading-tight ${status === 'active' ? 'text-success' : 'text-slate-400'}`}>
                        {status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Shift Registry',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <Calendar size={12} className="text-slate-400" />
                    {new Date(val).toLocaleDateString()}
                </div>
            )
        },
        {
            key: 'id',
            label: 'Operations',
            className: 'text-right',
            sortable: false,
            render: (_, user) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => onManage && onManage(user)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-primary"
                        title="Governance Protocol"
                    >
                        <ShieldAlert size={14} />
                    </button>
                    <button
                        onClick={() => onManage && onManage(user)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-emerald-600"
                        title="Management Console"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <section className="card-saas p-6 border-0 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <Users size={20} className="text-emerald-600" />
                        {title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Wrench size={20} className="text-emerald-600" />
                </div>
            </div>

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
                searchPlaceholder="Search operator fleet..."
                emptyMessage="No operators logged into the system registry."
            />
        </section>
    );
};

export default OperatorRegistry;
