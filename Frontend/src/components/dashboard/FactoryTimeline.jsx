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
    PROD: { color: 'var(--bs-brand)', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)' },
    QC: { color: 'var(--bs-success)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
    STAGE: { color: 'var(--bs-accent)', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
    ALERT: { color: 'var(--bs-danger)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    BATCH: { color: 'var(--bs-text-muted)', bg: 'var(--bs-background)', border: 'var(--bs-border)' },
    DEFAULT: { color: 'var(--bs-text-muted)', bg: 'var(--bs-background)', border: 'var(--bs-border)' }
};

const FactoryTimeline = ({ events = [], loading = false }) => {
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="skeleton" style={{ height: '8px', borderRadius: '4px', width: '25%' }} />
                            <div className="skeleton" style={{ height: '12px', borderRadius: '4px', width: '80%' }} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div style={{ padding: '32px', textAlign: 'center', border: '1.5px dashed var(--bs-border)', borderRadius: '10px' }}>
                <Clock style={{ margin: '0 auto 8px', opacity: 0.2, color: 'var(--bs-text-muted)' }} size={28} />
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)' }}>No recent floor activity</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', paddingLeft: '4px' }}>
            <div style={{ position: 'absolute', left: '27px', top: '8px', bottom: '8px', width: '1px', background: 'linear-gradient(to bottom, rgba(14,165,233,0.4), var(--bs-border), transparent)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {events.map((event, index) => {
                    const Icon = eventIcons[event.type] || eventIcons.DEFAULT;
                    const c = eventColors[event.type] || eventColors.DEFAULT;

                    return (
                        <motion.div
                            key={event.id || index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            style={{ position: 'relative', display: 'flex', gap: '14px' }}
                        >
                            <div style={{ position: 'relative', zIndex: 10, width: '28px', height: '28px', borderRadius: '8px', border: `1px solid ${c.border}`, backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: c.color }}>
                                <Icon size={13} />
                            </div>

                            <div style={{ flex: 1, paddingBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        {event.timestamp || 'Just Now'}
                                    </span>
                                    {event.batchId && (
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--bs-brand)', backgroundColor: 'rgba(14,165,233,0.08)', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                            {event.batchId}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bs-text-primary)', lineHeight: 1.4 }}>
                                    {event.message}
                                </p>
                                {event.meta && (
                                    <div style={{ fontSize: '10px', color: 'var(--bs-text-muted)', marginTop: '4px', fontWeight: 500, backgroundColor: 'var(--bs-background)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--bs-border)', display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
