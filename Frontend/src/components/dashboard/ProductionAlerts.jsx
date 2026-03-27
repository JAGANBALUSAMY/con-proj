import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Timer, ShieldAlert, Cpu, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const alertIcons = {
    delay: Timer,
    defect: ShieldAlert,
    machine: Cpu,
    default: AlertTriangle
};

const alertColors = {
    delay: 'bg-warning text-white',
    defect: 'bg-error text-white ring-4 ring-error/20',
    machine: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-slate-500/20',
    default: 'bg-primary text-white'
};

const ProductionAlerts = ({ alerts = [], onDismiss }) => {
    const navigate = useNavigate();

    const handleAlertClick = (alert) => {
        if (alert.path) {
            navigate(alert.path);
            onDismiss(alert.id);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm">
            <AnimatePresence>
                {alerts.map((alert) => {
                    const Icon = alertIcons[alert.category] || alertIcons.default;
                    const colorClass = alertColors[alert.category] || alertColors.default;

                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                            onClick={() => handleAlertClick(alert)}
                            className={`flex items-center gap-4 p-4 rounded-2xl shadow-2xl border border-white/10 cursor-pointer group active:scale-95 transition-all ${colorClass}`}
                        >
                            <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                                <Icon size={20} className={alert.category === 'defect' ? 'animate-pulse' : ''} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                                        {alert.title}
                                    </h4>
                                    {alert.path && <ArrowRight size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />}
                                </div>
                                <p className="text-[10px] font-bold opacity-90 leading-tight line-clamp-2">
                                    {alert.message}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss(alert.id);
                                }}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default ProductionAlerts;
