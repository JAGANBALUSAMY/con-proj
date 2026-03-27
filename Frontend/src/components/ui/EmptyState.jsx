import React from 'react';
import { motion } from 'framer-motion';

/**
 * EmptyState — centered empty/zero-data indicator
 * Props: icon, title, message, action (JSX), compact (bool)
 */
const EmptyState = ({ icon: Icon, title = 'Nothing here yet', message, action, compact = false }) => {
    return (
        <motion.div
            className="flex flex-col items-center justify-center text-center"
            style={{ padding: compact ? '32px 24px' : '64px 32px' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div
                className="mb-4 flex items-center justify-center rounded-2xl"
                style={{
                    width: compact ? 52 : 72,
                    height: compact ? 52 : 72,
                    backgroundColor: 'var(--bs-border)',
                    color: 'var(--bs-text-muted)',
                }}
            >
                {Icon && <Icon size={compact ? 22 : 30} />}
            </div>
            <h3
                className="font-semibold mb-1.5"
                style={{ fontSize: compact ? '14px' : '16px', color: 'var(--bs-text-primary)', letterSpacing: '-0.01em' }}
            >
                {title}
            </h3>
            {message && (
                <p className="max-w-xs" style={{ fontSize: '13px', color: 'var(--bs-text-secondary)', lineHeight: 1.5 }}>
                    {message}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </motion.div>
    );
};

export default EmptyState;
};

export default EmptyState;
