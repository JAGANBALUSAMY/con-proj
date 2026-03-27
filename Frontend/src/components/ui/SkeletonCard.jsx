import React from 'react';

/**
 * SkeletonCard — shimmer placeholder that matches StatCard shape
 *
 * Props:
 *   variant: 'stat' | 'table-row' | 'list' | 'chart' | 'card'
 *   count:   number of skeletons to render
 *   rows:    number of rows for 'table-row' variant
 */

const SkeletonLine = ({ width = '100%', height = 12, className = '' }) => (
    <div
        className={`skeleton rounded ${className}`}
        style={{ width, height }}
    />
);

const StatSkeleton = () => (
    <div
        className="stat-card"
        style={{ borderLeft: '3px solid var(--bs-border)' }}
    >
        <div className="flex justify-between items-start mb-4">
            <SkeletonLine width={40} height={40} className="rounded-md" />
            <SkeletonLine width={56} height={20} className="rounded-full" />
        </div>
        <SkeletonLine width={96} height={32} className="rounded mb-2" />
        <SkeletonLine width={128} height={12} className="rounded" />
        <div className="mt-4">
            <SkeletonLine width="100%" height={4} className="rounded-full" />
        </div>
    </div>
);

const CardSkeleton = ({ rows = 3 }) => (
    <div
        className="surface-card p-5"
        style={{ borderRadius: '10px' }}
    >
        <div className="flex items-center justify-between mb-5">
            <SkeletonLine width={120} height={16} />
            <SkeletonLine width={64} height={28} className="rounded-md" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
                <SkeletonLine width={32} height={32} className="rounded-md shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                    <SkeletonLine width={`${60 + i * 10}%`} height={12} />
                    <SkeletonLine width={`${40 + i * 8}%`} height={10} />
                </div>
            </div>
        ))}
    </div>
);

const TableRowSkeleton = ({ columns = 5 }) => (
    <tr style={{ borderBottom: '1px solid var(--bs-border)' }}>
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <SkeletonLine width={`${50 + (i * 13) % 40}%`} height={13} />
            </td>
        ))}
    </tr>
);

const ChartSkeleton = ({ height = 240 }) => (
    <div
        className="surface-card p-5"
        style={{ borderRadius: '10px' }}
    >
        <div className="flex items-center justify-between mb-5">
            <SkeletonLine width={140} height={16} />
            <SkeletonLine width={80} height={28} className="rounded-md" />
        </div>
        <div className="flex items-end gap-2" style={{ height }}>
            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton flex-1 rounded-t"
                    style={{ height: `${30 + ((i * 37 + 13) % 65)}%` }}
                />
            ))}
        </div>
        <div className="flex gap-4 mt-4 justify-center">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <SkeletonLine width={12} height={12} className="rounded-sm" />
                    <SkeletonLine width={48} height={10} />
                </div>
            ))}
        </div>
    </div>
);

const SkeletonCard = ({ variant = 'stat', count = 1, rows, columns, height }) => {
    const items = Array.from({ length: count });

    if (variant === 'stat') {
        return <>{items.map((_, i) => <StatSkeleton key={i} />)}</>;
    }
    if (variant === 'card') {
        return <>{items.map((_, i) => <CardSkeleton key={i} rows={rows || 3} />)}</>;
    }
    if (variant === 'chart') {
        return <>{items.map((_, i) => <ChartSkeleton key={i} height={height || 240} />)}</>;
    }
    if (variant === 'table-row') {
        return <>{items.map((_, i) => <TableRowSkeleton key={i} columns={columns || 5} />)}</>;
    }
    return null;
};

export { SkeletonCard, StatSkeleton, CardSkeleton, ChartSkeleton, TableRowSkeleton };
export default SkeletonCard;
