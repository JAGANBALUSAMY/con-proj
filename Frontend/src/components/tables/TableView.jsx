import React from 'react';
import {
    Search,
    ChevronUp,
    ChevronDown,
    Filter,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertCircle,
    RotateCcw
} from 'lucide-react';

const TableView = ({
    data,
    columns,
    sortConfig,
    requestSort,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    searchPlaceholder = "Filter records...",
    emptyMessage = "No records found.",
    loading = false,
    error = null,
    onRetry = null
}) => {
    // Calculate range
    const startRange = (currentPage - 1) * pageSize + 1;
    const endRange = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border pl-10 pr-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="hidden lg:block px-3 py-2 bg-background border border-border rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {totalItems} Total Records
                    </div>
                    <button className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:border-primary/30 transition-all">
                        <Filter size={14} /> Global Filters
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm relative min-h-[400px]">
                {/* States Overlay */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-background/40 border-b border-border">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest cursor-pointer hover:text-primary transition-colors group ${col.className || ''}`}
                                        onClick={() => col.sortable !== false && requestSort(col.key)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                            {col.sortable !== false && (
                                                <span className={`${sortConfig.key === col.key ? 'text-primary' : 'opacity-0 group-hover:opacity-40'} transition-all`}>
                                                    {sortConfig.key === col.key && sortConfig.direction === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border relative">
                            {error ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-24 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
                                                <AlertCircle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black uppercase text-text-primary">Sync Failed</h4>
                                                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase leading-relaxed">{error}</p>
                                            </div>
                                            {onRetry && (
                                                <button
                                                    onClick={onRetry}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <RotateCcw size={14} /> Attempt Recon
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : loading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {columns.map((col) => (
                                            <td key={col.key} className="px-6 py-4">
                                                <div className="h-2.5 bg-background rounded-full w-2/3" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.length > 0 ? (
                                data.map((item, idx) => (
                                    <tr key={item.id || idx} className="group hover:bg-background/30 transition-all border-l-2 border-transparent hover:border-primary">
                                        {columns.map((col) => (
                                            <td key={col.key} className={`px-6 py-4 text-[11px] font-bold text-text-primary ${col.cellClassName || ''}`}>
                                                {col.render ? col.render(item[col.key], item) : (
                                                    <span className="opacity-80 group-hover:opacity-100 transition-opacity">{item[col.key]}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-24 text-center">
                                        <div className="space-y-3">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-border">
                                                <Search size={20} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{emptyMessage}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination UI */}
            {!loading && !error && data.length > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Showing <span className="text-text-primary">{startRange}</span> - <span className="text-text-primary">{endRange}</span> of <span className="text-text-primary">{totalItems}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="p-2 rounded-lg border border-border bg-card text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center px-4 py-1.5 rounded-lg border border-border bg-card text-[10px] font-black text-text-primary uppercase tracking-widest shadow-sm">
                            Page {currentPage} of {totalPages}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="p-2 rounded-lg border border-border bg-card text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableView;
