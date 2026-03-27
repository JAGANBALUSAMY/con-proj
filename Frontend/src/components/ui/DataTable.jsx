import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

/**
 * DataTable — reusable data grid
 *
 * Props:
 *   columns: Array<{
 *     key: string,
 *     label: string,
 *     sortable?: bool,
 *     render?: (value, row) => JSX,
 *     align?: 'left' | 'center' | 'right',
 *     width?: string,
 *   }>
 *   data:      Array<object>
 *   loading:   bool
 *   pageSize:  number (default 15)
 *   selectable: bool
 *   onRowClick: fn(row)
 *   emptyMessage: string
 */
const DataTable = ({
    columns = [],
    data = [],
    loading = false,
    pageSize = 15,
    selectable = false,
    onRowClick,
    emptyMessage = 'No records found',
}) => {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(new Set());

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };

    const sorted = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const pageData = sorted.slice((page - 1) * pageSize, page * pageSize);

    const toggleRow = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleAll = () => {
        if (selected.size === pageData.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(pageData.map(r => r.id)));
        }
    };

    /* ---- Skeleton rows ---- */
    if (loading) {
        return (
            <div className="overflow-hidden rounded-[10px]" style={{ border: '1px solid var(--bs-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bs-surface-raised)' }}>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className="text-left px-4 py-3"
                                    style={{ width: col.width, borderBottom: '1px solid var(--bs-border-strong)' }}
                                >
                                    <div className="skeleton h-3 w-20 rounded" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--bs-border)' }}>
                                {columns.map(col => (
                                    <td key={col.key} className="px-4 py-3">
                                        <div className="skeleton h-4 rounded" style={{ width: `${60 + (i * 7 + col.key.length * 3) % 30}%` }} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0">
            <div className="overflow-x-auto rounded-[10px]" style={{ border: '1px solid var(--bs-border)' }}>
                <table className="data-table" style={{ minWidth: '100%' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bs-surface-raised)' }}>
                            {selectable && (
                                <th className="px-4 py-3 w-10" style={{ borderBottom: '1px solid var(--bs-border-strong)' }}>
                                    <input
                                        type="checkbox"
                                        checked={selected.size === pageData.length && pageData.length > 0}
                                        onChange={toggleAll}
                                        className="w-3.5 h-3.5 accent-brand cursor-pointer"
                                    />
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-left"
                                    style={{
                                        width: col.width,
                                        borderBottom: '1px solid var(--bs-border-strong)',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        color: col.key === sortKey ? 'var(--color-brand)' : 'var(--bs-text-muted)',
                                        cursor: col.sortable ? 'pointer' : 'default',
                                        userSelect: 'none',
                                        whiteSpace: 'nowrap',
                                        textAlign: col.align || 'left',
                                    }}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1.5" style={{ justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start' }}>
                                        {col.label}
                                        {col.sortable && (
                                            sortKey === col.key
                                                ? sortDir === 'asc'
                                                    ? <ChevronUp size={11} style={{ color: 'var(--color-brand)' }} />
                                                    : <ChevronDown size={11} style={{ color: 'var(--color-brand)' }} />
                                                : <ChevronsUpDown size={11} style={{ opacity: 0.35 }} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {pageData.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length + (selectable ? 1 : 0)}
                                        className="text-center py-16"
                                        style={{ color: 'var(--bs-text-muted)', fontSize: '13px' }}
                                    >
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                pageData.map((row, rowIdx) => (
                                    <motion.tr
                                        key={row.id ?? rowIdx}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        style={{
                                            backgroundColor: rowIdx % 2 === 1 ? 'rgba(var(--bs-surface-raised-rgb, 248,250,252),0.5)' : 'transparent',
                                            borderBottom: '1px solid var(--bs-border)',
                                            cursor: onRowClick ? 'pointer' : 'default',
                                            transition: 'background-color 0.1s ease',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bs-surface-raised)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = rowIdx % 2 === 1 ? 'rgba(248,250,252,0.5)' : 'transparent'; }}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {selectable && (
                                            <td className="px-4" style={{ height: '44px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(row.id)}
                                                    onChange={e => { e.stopPropagation(); toggleRow(row.id); }}
                                                    className="w-3.5 h-3.5 accent-brand cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {columns.map(col => (
                                            <td
                                                key={col.key}
                                                className="px-4"
                                                style={{
                                                    height: '44px',
                                                    fontSize: '13px',
                                                    color: 'var(--bs-text-primary)',
                                                    textAlign: col.align || 'left',
                                                    fontFamily: col.mono ? 'var(--font-mono)' : undefined,
                                                    fontFeatureSettings: col.mono ? '"tnum"' : undefined,
                                                }}
                                            >
                                                {col.render
                                                    ? col.render(row[col.key], row)
                                                    : col.status
                                                        ? <StatusBadge status={row[col.key]} />
                                                        : row[col.key] ?? <span style={{ color: 'var(--bs-text-muted)' }}>—</span>
                                                }
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div
                    className="flex items-center justify-between px-4 py-2.5 rounded-b-[10px]"
                    style={{
                        backgroundColor: 'var(--bs-surface-raised)',
                        borderTop: '1px solid var(--bs-border)',
                        fontSize: '12px',
                        color: 'var(--bs-text-muted)',
                    }}
                >
                    <span>
                        Showing <span style={{ color: 'var(--bs-text-primary)', fontWeight: 600 }}>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}</span>{' '}
                        of <span style={{ color: 'var(--bs-text-primary)', fontWeight: 600 }}>{sorted.length}</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center justify-center w-7 h-7 rounded-md disabled:opacity-30 transition-colors duration-100"
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-surface)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                            style={{ color: 'var(--bs-text-secondary)' }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className="flex items-center justify-center w-7 h-7 rounded-md text-[12px] font-medium transition-colors duration-100"
                                    style={{
                                        backgroundColor: p === page ? 'var(--color-brand)' : '',
                                        color: p === page ? '#fff' : 'var(--bs-text-secondary)',
                                        fontWeight: p === page ? 600 : 400,
                                    }}
                                    onMouseEnter={e => { if (p !== page) e.currentTarget.style.backgroundColor = 'var(--bs-surface)'; }}
                                    onMouseLeave={e => { if (p !== page) e.currentTarget.style.backgroundColor = ''; }}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="flex items-center justify-center w-7 h-7 rounded-md disabled:opacity-30 transition-colors duration-100"
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-surface)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                            style={{ color: 'var(--bs-text-secondary)' }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
