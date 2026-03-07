import React, { useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopNav from '../components/Layout/TopNav';
import ProductionAlerts from '../components/UI/ProductionAlerts';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = ({ children, title, systemStatus }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [alerts, setAlerts] = useState([
        { id: 1, type: 'info', title: 'System Warmup', message: 'All production lines are currently syncing with the cloud gateway.', duration: 5000 },
    ]);

    const dismissAlert = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

    return (
        <div className="flex min-h-screen bg-background font-inter text-text-primary selection:bg-primary/20 overflow-hidden">
            {/* 1. Sidebar with state sync */}
            <Sidebar collapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

            {/* 2. Main Execution Shell */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <TopNav systemStatus={systemStatus} title={title} />

                <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-6 lg:p-8">
                    <div className="max-w-[1600px] mx-auto">
                        {/* Breadcrumb / Title Area */}
                        <div className="mb-8 group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Workspace</span>
                                <span className="text-slate-300 dark:text-slate-700">/</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{title}</span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-all group-hover:translate-x-1">
                                {title}
                            </h1>
                        </div>

                        {/* Viewport content with micro-animations */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {/* 3. Global Notification Portal */}
            <ProductionAlerts alerts={alerts} onDismiss={dismissAlert} />
        </div>
    );
};

export default DashboardLayout;
