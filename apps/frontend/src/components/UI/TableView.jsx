import React from 'react';
import { Search, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import StatusBadge from './StatusBadge';

const TableView = ({
    data,
    columns,
    sortConfig,
    requestSort,
    searchTerm,
    setSearchTerm,
    searchPlaceholder = "Search records...",
    emptyMessage = "No records found.",
    loading = false
}) => {
    return (
        <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-saas pl-10"
                    />
                </div>
                <button className="btn-secondary p-2">
                    <Filter size={18} />
                </button>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-background/50 border-b border-border">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-widest cursor-pointer hover:text-primary transition-colors ${col.className || ''}`}
                                    onClick={() => col.sortable !== false && requestSort(col.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.label}
                                        {col.sortable !== false && sortConfig.key === col.key && (
                                            <span className="text-primary">
                                                {sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-6 py-4">
                                            <div className="h-4 bg-background rounded w-2/3" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length > 0 ? (
                            data.map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-background/40 transition-colors group">
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-6 py-4 text-sm text-text-primary ${col.cellClassName || ''}`}>
                                            {col.render ? col.render(item[col.key], item) : (
                                                <span className="font-medium">{item[col.key]}</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-text-secondary italic text-sm bg-background/10">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TableView;
