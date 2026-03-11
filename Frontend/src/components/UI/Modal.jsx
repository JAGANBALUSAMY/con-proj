import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal — accessible dialog with framer-motion animation
 *
 * Props:
 *   isOpen   — bool
 *   onClose  — fn
 *   title    — string
 *   children — JSX (body)
 *   footer   — JSX (action buttons)
 *   size     — 'sm' | 'md' | 'lg' | 'xl'
 *   maxWidth — legacy compat: CSS string e.g. 'max-w-lg'
 */

const SIZE_MAP = {
    sm: '460px',
    md: '560px',
    lg: '720px',
    xl: '900px',
};

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', maxWidth }) => {
    const width = maxWidth
        ? undefined   // legacy: maxWidth is a Tailwind class, applied via className
        : (SIZE_MAP[size] || SIZE_MAP.md);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="absolute inset-0"
                        style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ duration: 0.20, ease: 'easeOut' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        className={`relative w-full flex flex-col ${maxWidth || ''}`}
                        style={{
                            maxWidth: width,
                            maxHeight: 'calc(100vh - 64px)',
                            backgroundColor: 'var(--bs-surface)',
                            border: '1px solid var(--bs-border)',
                            borderRadius: '16px',
                            boxShadow: '0 12px 32px -4px rgb(0 0 0 / 0.35)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4 shrink-0"
                            style={{ borderBottom: '1px solid var(--bs-border)' }}
                        >
                            <h2
                                id="modal-title"
                                className="font-semibold"
                                style={{ fontSize: '16px', color: 'var(--bs-text-primary)', letterSpacing: '-0.01em' }}
                            >
                                {title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150"
                                style={{ color: 'var(--bs-text-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bs-background)'; e.currentTarget.style.color = 'var(--bs-text-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--bs-text-muted)'; }}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div
                                className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
                                style={{
                                    borderTop: '1px solid var(--bs-border)',
                                    backgroundColor: 'var(--bs-surface-raised)',
                                }}
                            >
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
