import React from 'react';
import { motion } from 'framer-motion';

/**
 * PageHeader — standard page title bar
 *
 * Props:
 *   title      — string
 *   subtitle   — string
 *   actions    — JSX (buttons)
 *   live       — bool (shows animated live indicator)
 *   lastUpdated — string
 */
const PageHeader = ({ title, subtitle, actions, live = false, lastUpdated }) => {
    return (
        <motion.div
            className="flex items-start justify-between mb-6 gap-4"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
        >
            {/* Title block */}
            <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1
                        style={{
                            fontFamily: 'var(--font-dm, "DM Sans", sans-serif)',
                            fontSize: '22px',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            color: 'var(--bs-text-primary)',
                            lineHeight: 1.2,
                        }}
                    >
                        {title}
                    </h1>
                    {live && (
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex items-center justify-center w-2 h-2">
                                <span
                                    className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping"
                                    style={{ backgroundColor: 'var(--bs-success)' }}
                                />
                                <span
                                    className="relative inline-flex rounded-full w-2 h-2"
                                    style={{ backgroundColor: 'var(--bs-success)' }}
                                />
                            </span>
                            <span
                                className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: 'var(--bs-success)' }}
                            >
                                Live
                            </span>
                        </div>
                    )}
                </div>
                {subtitle && (
                    <p
                        className="mt-1 text-[13px]"
                        style={{ color: 'var(--bs-text-secondary)' }}
                    >
                        {subtitle}
                    </p>
                )}
                {lastUpdated && (
                    <p
                        className="mt-0.5 text-[11px] font-mono"
                        style={{ color: 'var(--bs-text-muted)' }}
                    >
                        Updated {lastUpdated}
                    </p>
                )}
            </div>

            {/* Actions */}
            {actions && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {actions}
                </div>
            )}
        </motion.div>
    );
};

export default PageHeader;
