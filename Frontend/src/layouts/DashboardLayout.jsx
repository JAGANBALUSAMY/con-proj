import React, { useState } from 'react';
import Sidebar from '@frontend/layouts/Sidebar';
import TopBar from '@frontend/layouts/TopBar';
import { motion } from 'framer-motion';

const DashboardLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ backgroundColor: 'var(--bs-background)', color: 'var(--bs-text-primary)', fontFamily: 'var(--font-inter)' }}
        >
            {/* Sidebar — always dark */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(prev => !prev)}
            />

            {/* Main shell */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar />

                <main className="flex-1 overflow-y-auto scroll-smooth" style={{ padding: '24px 32px' }}>
                    <motion.div
                        key={typeof children === 'object' ? children?.type?.name : 'page'}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="page-container min-h-full pb-16"
                    >
                        {children}
                    </motion.div>
                </main>

                {/* Status footer */}
                <footer
                    className="px-8 py-2.5 flex justify-between items-center shrink-0"
                    style={{
                        backgroundColor: 'var(--bs-surface)',
                        borderTop: '1px solid var(--bs-border)',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--bs-text-muted)',
                    }}
                >
                    <div className="flex items-center gap-6">
                        <span>BRIEFSYNC v2.5.0</span>
                        <div className="flex items-center gap-2">
                            <div className="relative w-1.5 h-1.5 rounded-full bg-success live-dot" />
                            <span style={{ color: 'var(--color-success)' }}>PRODUCTION SYNC ACTIVE</span>
                        </div>
                    </div>
                    <div className="flex gap-5 opacity-50">
                        <span>LATENCY: 12MS</span>
                        <span>STATUS: VERIFIED</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DashboardLayout;
