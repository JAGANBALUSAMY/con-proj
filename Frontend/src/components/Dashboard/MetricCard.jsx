import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    description,
    color = 'primary'
}) => {
    const colorMap = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        error: 'bg-error/10 text-error border-error/20',
        neutral: 'bg-neutral/10 text-neutral border-neutral/20',
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="card-saas p-6 flex flex-col gap-4"
        >
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.primary}`}>
                    {Icon && <Icon size={24} />}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                        }`}>
                        {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trendValue}
                    </div>
                )}
            </div>

            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-80">{title}</p>
                <h3 className="text-3xl font-bold text-text-primary mt-1.5 leading-none tracking-tight">{value}</h3>
            </div>

            {description && (
                <p className="text-[10px] font-bold text-text-secondary/60 italic leading-tight border-t border-border/50 pt-2">
                    {description}
                </p>
            )}
        </motion.div>
    );
};

export default MetricCard;
