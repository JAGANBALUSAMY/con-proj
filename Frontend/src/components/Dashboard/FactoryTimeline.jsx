import React from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Zap,
    Box,
    User
} from 'lucide-react';

const eventIcons = {
    PROD: Zap,
    QC: CheckCircle2,
    STAGE: ArrowRight,
    ALERT: AlertCircle,
    BATCH: Box,
    USER: User,
    DEFAULT: Clock
};

const eventColors = {
    PROD: 'text-primary bg-primary/10 border-primary/20',
    QC: 'text-success bg-success/10 border-success/20',
    STAGE: 'text-info bg-info/10 border-info/20',
    ALERT: 'text-error bg-error/10 border-error/20',
    BATCH: 'text-slate-500 bg-slate-100 border-slate-200',
    DEFAULT: 'text-slate-400 bg-slate-50 border-slate-100'
};

const FactoryTimeline = ({ events = [], loading = false }) => {
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse p-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100" />
                        <div className="flex-1 space-y-2">
                            <div className="h-2 bg-slate-100 rounded w-1/4" />
                            <div className="h-3 bg-slate-100 rounded w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="p-12 text-center text-slate-400 border-2 border-dashed border-border rounded-2xl">
                <Clock className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest">No recent floor activity</p>
            </div>
        );
    }

    return (
        <div className="relative pl-4">
            {/* Thread Line */}
            <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />

            <div className="space-y-6">
                {events.map((event, index) => {
                    const Icon = eventIcons[event.type] || eventIcons.DEFAULT;
                    const colorClass = eventColors[event.type] || eventColors.DEFAULT;

                    return (
                        <motion.div
                            key={event.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative flex gap-4 group"
                        >
                            <div className={`
                                relative z-10 w-7 h-7 rounded-lg border flex items-center justify-center transition-all group-hover:scale-110 shadow-sm
                                ${colorClass}
                            `}>
                                <Icon size={14} />
                            </div>

                            <div className="flex-1 pb-1">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {event.timestamp || 'Just Now'}
                                    </span>
                                    {event.batchId && (
                                        <span className="text-[9px] font-bold text-primary bg-primary/5 px-1.5 rounded uppercase">
                                            {event.batchId}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-bold text-text-primary leading-snug group-hover:text-primary transition-colors">
                                    {event.message}
                                </p>
                                {event.meta && (
                                    <div className="text-[10px] text-slate-500 mt-1 font-medium bg-background/50 p-1.5 rounded-lg border border-border/50 inline-block uppercase tracking-tight">
                                        {event.meta}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default FactoryTimeline;
