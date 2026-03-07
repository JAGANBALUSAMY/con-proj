import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, Info, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const NotificationPanel = ({ isOpen, onClose, notifications = [] }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-sm" onClick={onClose} />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="absolute top-16 right-6 z-50 w-full max-w-sm bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 dark:text-white">Industrial Alerts</h3>
                                <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{notifications.length}</span>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={16} className="text-slate-400" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {notifications.map((n) => (
                                        <div key={n.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
                                            <div className="flex gap-4">
                                                <div className={`shrink-0 mt-1 p-2 rounded-xl border ${n.type === 'error' ? 'bg-error/10 text-error border-error/20' :
                                                        n.type === 'warning' ? 'bg-warning/10 text-warning border-warning/20' :
                                                            n.type === 'success' ? 'bg-success/10 text-success border-success/20' :
                                                                'bg-primary/10 text-primary border-primary/20'
                                                    }`}>
                                                    {n.type === 'error' && <AlertCircle size={16} />}
                                                    {n.type === 'warning' && <AlertTriangle size={16} />}
                                                    {n.type === 'success' && <CheckCircle2 size={16} />}
                                                    {n.type === 'info' && <Info size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{n.title}</h4>
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0">
                                                            <Clock size={10} />
                                                            {n.time}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                                        {n.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <Bell size={32} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                                    <p className="text-slate-400 text-sm font-medium italic">No active production alerts.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800">
                            <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-dark transition-colors">
                                View All Activity History
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationPanel;
