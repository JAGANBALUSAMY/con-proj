import React from 'react';
import TableView from '../../components/tables/TableView';
import { useTable } from '../../components/tables/useTable';
import Badge from '../../components/ui/Badge';
import { Shield, Mail, Phone, Calendar, ExternalLink } from 'lucide-react';

const ManagerView = ({ users, loading, onRefresh, onManage }) => {
    const managers = users.filter(u => u.role === 'MANAGER');

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
    } = useTable(managers, {
        searchKeys: ['fullName', 'employeeCode', 'email']
    });

    const columns = [
        {
            key: 'fullName',
            label: 'Manager Identity',
            render: (val, user) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">
                        {val.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{val}</div>
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{user.employeeCode}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'sections',
            label: 'Assigned Jurisdictions',
            render: (sections) => (
                <div className="flex flex-wrap gap-1">
                    {(sections || []).length > 0 ? (
                        sections.map(s => <Badge key={s} status={s} />)
                    ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase italic">No Sections</span>
                    )}
                </div>
            )
        },
        {
            key: 'email',
            label: 'Contact Infrastructure',
            render: (val, user) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Mail size={12} className="text-slate-400" />
                        {val}
                    </div>
                    {user.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                            <Phone size={10} className="text-slate-400" />
                            {user.phoneNumber}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'verificationStatus',
            label: 'System Access',
            render: (val) => (
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${val === 'VERIFIED' ? 'bg-success' : 'bg-warning'} shadow-[0_0_8px_rgba(var(--color-success),0.5)]`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{val}</span>
                </div>
            )
        },
        {
            key: 'createdAt',
            label: 'Commissioned',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <Calendar size={12} className="text-slate-400" />
                    {new Date(val).toLocaleDateString()}
                </div>
            )
        },
        {
            key: 'id',
            label: 'Protocol',
            className: 'text-right',
            sortable: false,
            render: (id, user) => (
                <button
                    onClick={() => onManage && onManage(user)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-primary"
                    title="Governance Protocol"
                >
                    <ExternalLink size={16} />
                </button>
            )
        }
    ];

    return (
        <section className="card-saas p-6 border-0 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                        <Shield size={20} className="text-primary" />
                        Management Fleet
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized factory supervisors and section leads</p>
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
                searchPlaceholder="Search management registry..."
                emptyMessage="No managers found in the registry."
            />
        </section>
    );
};

export default ManagerView;
