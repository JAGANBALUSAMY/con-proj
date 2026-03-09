import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Clock,
    AlertTriangle,
    Activity,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

const PipelineViz = ({ stages = [] }) => {
    return (
        <div className="card-saas p-6 bg-white dark:bg-card-dark overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Production Flow Intelligence</h3>
                    <p className="text-xs text-slate-500 font-medium">Real-time throughput analysis across all factory sections</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Optimal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Congested</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Critical</span>
                    </div>
                </div>
            </div>

            <div className="relative flex flex-col lg:flex-row items-stretch gap-4">
                {stages.map((stage, index) => (
                    <React.Fragment key={stage.name}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`
                flex-1 p-5 rounded-2xl border-2 transition-all relative group
                ${stage.status === 'error' ? 'bg-error/5 border-error/20' :
                                    stage.status === 'delay' ? 'bg-warning/5 border-warning/20' :
                                        'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800'}
              `}
                        >
                            {/* Header: Stage Name & Health */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stage.name.replace('_', ' ')}</span>
                                {stage.status === 'error' ? <AlertCircle size={14} className="text-error" /> :
                                    stage.status === 'delay' ? <AlertTriangle size={14} className="text-warning" /> :
                                        <CheckCircle2 size={14} className="text-success" />}
                            </div>

                            {/* Main Metric: Active Count */}
                            <div className="flex items-baseline gap-2 mb-4">
                                <h4 className={`text-3xl font-black ${stage.status === 'error' ? 'text-error' : stage.status === 'delay' ? 'text-warning' : 'text-slate-900 dark:text-white'}`}>
                                    {stage.count}
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Batches</span>
                            </div>

                            {/* Detail Grid */}
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <Clock size={10} />
                                        <span className="text-[9px] font-bold uppercase tracking-wider">Avg Time</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{stage.avgTime || '0m'}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <AlertTriangle size={10} />
                                        <span className="text-[9px] font-bold uppercase tracking-wider">Defects</span>
                                    </div>
                                    <p className={`text-xs font-bold ${stage.defects > 0 ? 'text-error' : 'text-slate-700 dark:text-slate-300'}`}>{stage.defects}</p>
                                </div>
                            </div>

                            {/* Warning Tooltip for Delay/Error */}
                            {stage.status !== 'normal' && (
                                <div className={`mt-3 p-2 rounded-lg text-[9px] font-bold uppercase leading-tight ${stage.status === 'error' ? 'bg-error text-white' : 'bg-warning text-slate-900'}`}>
                                    {stage.status === 'error' ? 'Critical Action Required' : 'Potential Bottleneck'}
                                </div>
                            )}
                        </motion.div>

                        {index < stages.length - 1 && (
                            <div className="hidden lg:flex items-center text-slate-200 dark:text-slate-800 shrink-0">
                                <ArrowRight size={20} />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default PipelineViz;
