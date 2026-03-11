import React from 'react';
import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    RotateCcw,
} from 'lucide-react';

/**
 * TableView — themed data table wrapper (matches design system)
 * Used by pages that already call useTable() hook.
 */
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
    searchPlaceholder = 'Filter records…',
    emptyMessage = 'No records found',
    loading = false,
    error = null,
    onRetry = null,
}) => {
    const startRange = (currentPage - 1) * pageSize + 1;
    const endRange = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="flex flex-col gap-4">
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                    <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--bs-text-muted)' }}
                    />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 text-sm rounded-md outline-none transition-all"
                        style={{
                            backgroundColor: 'var(--bs-background)',
                            border: '1px solid var(--bs-border)',
                            borderRadius: '6px',
                            color: 'var(--bs-text-primary)',
                            fontSize: '13px',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#0EA5E9'; e.target.style.boxShadow = '0 0 0 3px rgb(14 165 233 / 0.10)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--bs-border)'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>
                <span
                    className="text-[11px] font-medium whitespace-nowrap"
                    style={{ color: 'var(--bs-text-muted)' }}
                >
                    {totalItems} records
                </span>
            </div>

            {/* Table */}
            <div
                className="overflow-hidden"
                style={{ border: '1px solid var(--bs-border)', borderRadius: '10px' }}
            >
                <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bs-surface-raised)' }}>
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        className={col.className || ''}
                                        onClick={() => col.sortable !== false && requestSort(col.key)}
                                        style={{
                                            padding: '10px 16px',
                                            borderBottom: '1px solid var(--bs-border-strong)',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            color: sortConfig?.key === col.key ? '#0EA5E9' : 'var(--bs-text-muted)',
                                            cursor: col.sortable !== false ? 'pointer' : 'default',
                                            userSelect: 'none',
                                            textAlign: 'left',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {col.label}
                                            {col.sortable !== false && sortConfig?.key === col.key && (
                                                sortConfig.direction === 'desc'
                                                    ? <ChevronDown size={11} />
                                                    : <ChevronUp size={11} />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {error ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ padding: '64px 24px', textAlign: 'center' }}>
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.10)', color: 'var(--bs-danger)' }}>
                                                <AlertCircle size={20} />
                                            </div>
                                            <p className="text-[13px]" style={{ color: 'var(--bs-text-secondary)' }}>{error}</p>
                                            {onRetry && (
                                                <button
                                                    onClick={onRetry}
                                                    className="flex items-center gap-2 px-4 h-8 rounded-md text-[12px] font-medium"
                                                    style={{ backgroundColor: '#0EA5E9', color: '#fff', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <RotateCcw size={13} /> Retry
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--bs-border)' }}>
                                        {columns.map(col => (
                                            <td key={col.key} style={{ padding: '12px 16px' }}>
                                                <div className="skeleton h-3.5 rounded" style={{ width: `${55 + ((i * 11 + col.key.length * 7) % 35)}%` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--bs-text-muted)', fontSize: '13px' }}>
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr
                                        key={item.id || idx}
                                        style={{
                                            borderBottom: '1px solid var(--bs-border)',
                                            backgroundColor: idx % 2 === 1 ? 'rgba(248,250,252,0.03)' : 'transparent',
                                            transition: 'background-color 0.1s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-surface-raised)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 1 ? 'rgba(248,250,252,0.03)' : 'transparent'}
                                    >
                                        {columns.map(col => (
                                            <td
                                                key={col.key}
                                                className={col.cellClassName || ''}
                                                style={{ padding: '0 16px', height: '44px', color: 'var(--bs-text-primary)', verticalAlign: 'middle' }}
                                            >
                                                {col.render ? col.render(item[col.key], item) : item[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {!loading && !error && data.length > 0 && totalPages > 1 && (
                <div
                    className="flex items-center justify-between"
                    style={{ fontSize: '12px', color: 'var(--bs-text-muted)' }}
                >
                    <span>
                        Showing <strong style={{ color: 'var(--bs-text-primary)' }}>{startRange}–{endRange}</strong> of{' '}
                        <strong style={{ color: 'var(--bs-text-primary)' }}>{totalItems}</strong>
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="flex items-center justify-center w-7 h-7 rounded-md disabled:opacity-30 transition-colors"
                            style={{ border: '1px solid var(--bs-border)', color: 'var(--bs-text-secondary)', backgroundColor: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = 'var(--bs-surface)'; }}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span
                            className="px-3 h-7 flex items-center rounded-md text-[11px] font-semibold"
                            style={{ border: '1px solid var(--bs-border)', backgroundColor: 'var(--bs-surface)', color: 'var(--bs-text-primary)' }}
                        >
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="flex items-center justify-center w-7 h-7 rounded-md disabled:opacity-30 transition-colors"
                            style={{ border: '1px solid var(--bs-border)', color: 'var(--bs-text-secondary)', backgroundColor: 'transparent', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = 'var(--bs-surface)'; }}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableView;
