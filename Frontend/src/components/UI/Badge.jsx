import React from 'react';

const StatusBadge = ({ status, variant = 'default' }) => {
    const baseClasses = "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300";

    const variants = {
        default: {
            // Production Lifecycle
            PENDING: "bg-warning/10 text-warning border-warning/20",
            APPROVED: "bg-success/10 text-success border-success/20",
            REJECTED: "bg-error/10 text-error border-error/20",
            COMPLETED: "bg-primary/10 text-primary border-primary/20 shadow-sm",
            ACTIVE: "bg-success/10 text-success border-success/20 animate-pulse",
            INACTIVE: "bg-background text-text-secondary border-border",

            // Operational States
            RUNNING: "bg-success text-white border-success shadow-md shadow-success/20",
            IDLE: "bg-background text-text-secondary border-border",
            DELAYED: "bg-warning text-white border-warning shadow-md shadow-warning/20 animate-pulse",
            ERROR: "bg-error text-white border-error shadow-md shadow-error/20 animate-bounce",
            WARNING: "bg-warning/10 text-warning border-warning/20 font-bold",
        },
        machine: {
            RUNNING: "bg-success text-white border-success shadow-lg shadow-success/20 animate-pulse",
            IDLE: "bg-text-secondary/10 text-text-secondary border-text-secondary/20",
            MAINTENANCE: "bg-error text-white border-error shadow-lg shadow-error/20",
            OFFLINE: "bg-text-primary text-background border-text-primary",
        },
        qc: {
            CLEARED: "bg-success/10 text-success border-success/20",
            DEFECTIVE: "bg-warning/10 text-warning border-warning/20",
            SCRAPPED: "bg-error/10 text-error border-error/20",
        }
    };

    const currentVariant = variants[variant] || variants.default;
    const classes = currentVariant[status] || "bg-background text-text-secondary border-border";

    return (
        <span className={`${baseClasses} ${classes}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

export default StatusBadge;
