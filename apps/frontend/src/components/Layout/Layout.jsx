import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children, title, systemStatus }) => {
    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-inter">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <TopNav systemStatus={systemStatus} />
                <main className="flex-1 p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="max-w-[1600px] mx-auto"
                        >
                            {/* Optional Section Header redundant with breadcrumbs/TopNav Title logic */}
                            <div className="mb-8">
                                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    {title}
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">
                                    Manage your factory operations and track production in real-time.
                                </p>
                            </div>

                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default Layout;
