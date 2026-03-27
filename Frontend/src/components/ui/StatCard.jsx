import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard — KPI / metric tile
 *
 * Props:
 *   icon       — Lucide icon component
 *   label      — string
 *   value      — string | number
 *   delta      — number  (% change, e.g. 12.4 or -3.2)
 *   deltaLabel — string  (e.g. "vs yesterday")
 *   accent     — 'brand' | 'success' | 'warning' | 'danger' | 'accent'
 *   loading    — bool
 *   sparkline  — bool (shows mini progress bar)
 *   progress   — 0–100 (for sparkline/progress bar)
 */
const ACCENT_MAP = {
    brand:   { border: '#0EA5E9', icon: 'rgb(14 165 233 / 0.12)', iconColor: '#0EA5E9', glow: 'rgb(14 165 233 / 0.20)' },
    success: { border: '#10B981', icon: 'rgb(16 185 129 / 0.12)', iconColor: '#10B981', glow: 'rgb(16 185 129 / 0.20)' },
    warning: { border: '#FBBF24', icon: 'rgb(251 191 36 / 0.12)',  iconColor: '#FBBF24', glow: 'rgb(251 191 36 / 0.20)' },
    danger:  { border: '#EF4444', icon: 'rgb(239 68 68 / 0.12)',   iconColor: '#EF4444', glow: 'rgb(239 68 68 / 0.20)' },
    accent:  { border: '#F97316', icon: 'rgb(249 115 22 / 0.12)',  iconColor: '#F97316', glow: 'rgb(249 115 22 / 0.20)' },
};

/* Count-up animation hook */
function useCountUp(target, duration = 900) {
    const [current, setCurrent] = useState(0);
    const frame = useRef(null);
    useEffect(() => {
        const numeric = parseFloat(String(target).replace(/[^0-9.]/g, ''));
        if (isNaN(numeric)) { setCurrent(target); return; }
        const start = performance.now();
        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(Math.round(eased * numeric));
            if (progress < 1) frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame.current);
    }, [target, duration]);
    return current;
}

const StatCard = ({
    icon: Icon,
    label,
    value,
    delta,
    deltaLabel,
    accent = 'brand',
    loading = false,
    progress,
    index = 0,
}) => {
    const colors = ACCENT_MAP[accent] || ACCENT_MAP.brand;
    const animated = useCountUp(loading ? 0 : value);
    const displayValue = typeof value === 'number' ? animated : value;

    const deltaPositive = delta > 0;
    const deltaNeutral  = delta === 0 || delta == null;
    const DeltaIcon = deltaNeutral ? Minus : deltaPositive ? TrendingUp : TrendingDown;
    const deltaColor = deltaNeutral
        ? 'var(--bs-text-muted)'
        : deltaPositive
            ? '#10B981'
            : '#EF4444';

    if (loading) {
        return (
            <div
                className="stat-card"
                style={{ borderLeft: `3px solid ${colors.border}` }}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="skeleton w-10 h-10 rounded-md" />
                    <div className="skeleton w-14 h-5 rounded-full" />
                </div>
                <div className="skeleton w-24 h-8 rounded mb-2" />
                <div className="skeleton w-32 h-3 rounded" />
            </div>
        );
    }

    return (
        <motion.div
            className="stat-card group"
            style={{ borderLeft: `3px solid ${colors.border}` }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: index * 0.04 }}
            whileHover={{ y: -2 }}
        >
            {/* Top row: icon + delta */}
            <div className="flex items-start justify-between mb-3">
                <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: colors.icon }}
                >
                    {Icon && <Icon size={18} style={{ color: colors.iconColor }} />}
                </div>

                {delta != null && (
                    <div
                        className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full"
                        style={{
                            color: deltaColor,
                            backgroundColor: deltaNeutral
                                ? 'var(--bs-border)'
                                : deltaPositive
                                    ? 'rgb(16 185 129 / 0.10)'
                                    : 'rgb(239 68 68 / 0.10)',
                        }}
                    >
                        <DeltaIcon size={10} strokeWidth={2.5} />
                        {delta != null && `${Math.abs(delta)}%`}
                    </div>
                )}
            </div>

            {/* Metric value */}
            <div
                className="text-[32px] leading-tight font-mono font-semibold mb-1"
                style={{
                    color: 'var(--bs-text-primary)',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '-0.02em',
                }}
            >
                {displayValue}
            </div>

            {/* Label */}
            <p
                className="text-[12px] font-medium"
                style={{ color: 'var(--bs-text-secondary)' }}
            >
                {label}
                {deltaLabel && (
                    <span className="ml-1.5 text-[10px]" style={{ color: 'var(--bs-text-muted)' }}>
                        {deltaLabel}
                    </span>
                )}
            </p>

            {/* Progress bar (optional) */}
            {progress != null && (
                <div
                    className="mt-3 h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bs-border)' }}
                >
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: colors.border }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress)}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: index * 0.04 + 0.1 }}
                    />
                </div>
            )}
        </motion.div>
    );
};

export default StatCard;
