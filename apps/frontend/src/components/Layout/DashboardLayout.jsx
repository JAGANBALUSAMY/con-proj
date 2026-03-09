import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-background text-text-primary font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Execution Shell */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar />

                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-[1600px] mx-auto min-h-full pb-12"
                    >
                        {children}
                    </motion.div>
                </main>

                {/* Industrial Footer */}
                <footer className="px-8 py-3 bg-card border-t border-border flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                    <div className="flex items-center gap-6">
                        <span>BRIEFSCORE v2.5.0</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-success ring-4 ring-success/10 animate-pulse" />
                            <span className="text-success">PRODUCTION CORE SYNC ACTIVE</span>
                        </div>
                    </div>
                    <div className="flex gap-4 opacity-50">
                        <span>LATENCY: 12MS</span>
                        <span>STATUS: VERIFIED</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DashboardLayout;
