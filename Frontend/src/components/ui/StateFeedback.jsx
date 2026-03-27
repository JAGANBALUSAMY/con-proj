import React from 'react';
import { Loader2, Inbox, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export const SkeletonLoader = () => (
    <div className="w-full space-y-4 animate-pulse p-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-800" />
            ))}
        </div>
        <div className="h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/20 dark:border-slate-800" />
    </div>
);

export const EmptyState = ({ message = "No data available at this time.", icon: Icon = Inbox }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 text-center"
    >
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
            <Icon size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">{message}</h3>
        <p className="text-sm text-text-secondary max-w-xs mx-auto">
            Operational records for this criteria haven't synced with the cloud gateway yet.
        </p>
    </motion.div>
);

export const ErrorState = ({ message = "Communication breakdown.", onRetry }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-error/5 rounded-3xl border border-error/10">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4 border border-error/20">
            <AlertCircle size={32} className="text-error" />
        </div>
        <h3 className="text-lg font-bold text-error mb-2">{message}</h3>
        <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            We encountered a synchronization error with the factory backend. Check your network connection or try a hard refresh.
        </p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="flex items-center gap-2 px-6 py-2.5 bg-error text-white rounded-xl font-bold shadow-lg shadow-error/20 hover:scale-105 transition-transform"
            >
                <RefreshCcw size={18} /> Retry Sync
            </button>
        )}
    </div>
);
