import React from 'react';

/**
 * StatusBadge — semantic status pill
 *
 * status: 'running' | 'complete' | 'completed' | 'rework' | 'fault' | 'fail' |
 *         'idle' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' |
 *         'maintenance' | 'offline' | 'delayed' | 'cleared' | 'defective' | 'scrapped'
 * size: 'sm' | 'md' | 'lg'
 */

const VARIANT_MAP = {
    running:     { bg: 'rgb(14 165 233 / 0.12)',  text: '#38BDF8', darkBg: 'rgb(14 165 233 / 0.18)', dot: 'pulse',   label: 'Running' },
    active:      { bg: 'rgb(14 165 233 / 0.12)',  text: '#38BDF8', dot: 'pulse',   label: 'Active' },
    complete:    { bg: 'rgb(16 185 129 / 0.12)',  text: '#34D399', dot: 'solid',   label: 'Complete' },
    completed:   { bg: 'rgb(16 185 129 / 0.12)',  text: '#34D399', dot: 'solid',   label: 'Completed' },
    approved:    { bg: 'rgb(16 185 129 / 0.12)',  text: '#34D399', dot: 'solid',   label: 'Approved' },
    cleared:     { bg: 'rgb(16 185 129 / 0.12)',  text: '#34D399', dot: 'solid',   label: 'Cleared' },
    rework:      { bg: 'rgb(251 191 36 / 0.12)',  text: '#FCD34D', dot: 'solid',   label: 'Rework' },
    delayed:     { bg: 'rgb(251 191 36 / 0.12)',  text: '#FCD34D', dot: 'pulse',   label: 'Delayed' },
    defective:   { bg: 'rgb(251 191 36 / 0.12)',  text: '#FCD34D', dot: 'solid',   label: 'Defective' },
    warning:     { bg: 'rgb(251 191 36 / 0.12)',  text: '#FCD34D', dot: 'solid',   label: 'Warning' },
    pending:     { bg: 'rgb(249 115 22 / 0.12)',  text: '#FB923C', dot: 'pulse',   label: 'Pending' },
    fault:       { bg: 'rgb(239 68 68 / 0.12)',   text: '#F87171', dot: 'strobe',  label: 'Fault' },
    fail:        { bg: 'rgb(239 68 68 / 0.12)',   text: '#F87171', dot: 'strobe',  label: 'Fail' },
    failed:      { bg: 'rgb(239 68 68 / 0.12)',   text: '#F87171', dot: 'strobe',  label: 'Failed' },
    rejected:    { bg: 'rgb(239 68 68 / 0.12)',   text: '#F87171', dot: 'solid',   label: 'Rejected' },
    scrapped:    { bg: 'rgb(239 68 68 / 0.12)',   text: '#F87171', dot: 'solid',   label: 'Scrapped' },
    maintenance: { bg: 'rgb(239 68 68 / 0.12)',   text: '#F87171', dot: 'solid',   label: 'Maintenance' },
    idle:        { bg: 'rgb(100 116 139 / 0.10)', text: '#94A3B8', dot: 'none',    label: 'Idle' },
    inactive:    { bg: 'rgb(100 116 139 / 0.10)', text: '#94A3B8', dot: 'none',    label: 'Inactive' },
    offline:     { bg: 'rgb(30 41 59 / 0.60)',    text: '#64748B', dot: 'none',    label: 'Offline' },
};

const SIZE_MAP = {
    sm: { height: '20px', fontSize: '10px', px: '6px', dotSize: '5px' },
    md: { height: '24px', fontSize: '11px', px: '8px', dotSize: '6px' },
    lg: { height: '28px', fontSize: '12px', px: '10px', dotSize: '7px' },
};

const StatusBadge = ({ status, size = 'md', className = '', customLabel }) => {
    if (!status) return null;

    const key = String(status).toLowerCase().replace(/[\s_]/g, '_').replace(/_/g, '');
    const normalized = Object.keys(VARIANT_MAP).find(k => k === key) || 'idle';
    const v = VARIANT_MAP[normalized];
    const s = SIZE_MAP[size] || SIZE_MAP.md;

    const dotClass = v.dot === 'pulse'
        ? 'status-dot-pulse'
        : v.dot === 'strobe'
            ? 'status-dot-strobe'
            : '';

    return (
        <span
            className={`status-pill ${className}`}
            style={{
                height: s.height,
                fontSize: s.fontSize,
                padding: `0 ${s.px}`,
                backgroundColor: v.bg,
                color: v.text,
            }}
        >
            {v.dot !== 'none' && (
                <span
                    className={`rounded-full shrink-0 ${dotClass}`}
                    style={{
                        width: s.dotSize,
                        height: s.dotSize,
                        backgroundColor: v.text,
                        display: 'inline-block',
                    }}
                />
            )}
            {customLabel || v.label || String(status).replace(/[_]/g, ' ')}
        </span>
    );
};

export default StatusBadge;
