import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, Bell } from 'lucide-react';

const ProductionAlerts = ({ alerts = [], onDismiss }) => {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
            <AnimatePresence>
                {alerts.map((alert) => (
                    <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className={`
              pointer-events-auto p-4 rounded-2xl shadow-2xl border flex gap-4 items-start
              ${alert.type === 'error' ? 'bg-error/10 border-error/20 text-error' :
                                alert.type === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
                                    alert.type === 'success' ? 'bg-success/10 border-success/20 text-success' :
                                        'bg-slate-900 border-slate-800 text-slate-300'}
            `}
                    >
                        <div className="shrink-0 mt-0.5">
                            {alert.type === 'error' && <AlertCircle size={20} />}
                            {alert.type === 'warning' && <AlertCircle size={20} />}
                            {alert.type === 'success' && <CheckCircle2 size={20} />}
                            {alert.type === 'info' && <Bell size={20} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold leading-tight">{alert.title}</h4>
                            <p className="text-xs mt-1 opacity-80 leading-relaxed font-medium">{alert.message}</p>
                        </div>
                        <button
                            onClick={() => onDismiss(alert.id)}
                            className="shrink-0 hover:bg-black/5 rounded-lg p-0.5 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ProductionAlerts;
