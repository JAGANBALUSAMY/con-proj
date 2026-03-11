import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Button — unified button component
 *
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent'
 * size:    'sm' | 'md' | 'lg'
 * iconOnly: bool — renders as square icon button
 * loading:  bool
 * leftIcon / rightIcon — Lucide icon component
 */

const VARIANT_STYLES = {
    primary: {
        bg: '#0EA5E9',
        color: '#FFFFFF',
        border: 'none',
        hover: 'filter: brightness(1.1)',
        shadow: '0 4px 14px -2px rgb(14 165 233 / 0.30)',
    },
    accent: {
        bg: '#F97316',
        color: '#FFFFFF',
        border: 'none',
        shadow: '0 4px 14px -2px rgb(249 115 22 / 0.30)',
    },
    secondary: {
        bg: 'transparent',
        color: 'var(--bs-text-primary)',
        border: '1px solid var(--bs-border)',
        shadow: 'none',
    },
    danger: {
        bg: '#EF4444',
        color: '#FFFFFF',
        border: 'none',
        shadow: '0 4px 14px -2px rgb(239 68 68 / 0.25)',
    },
    ghost: {
        bg: 'transparent',
        color: 'var(--bs-text-secondary)',
        border: 'none',
        shadow: 'none',
    },
};

const SIZE_STYLES = {
    sm: { height: '32px', padding: '0 12px', fontSize: '12px', iconSize: 13 },
    md: { height: '36px', padding: '0 16px', fontSize: '13px', iconSize: 15 },
    lg: { height: '44px', padding: '0 20px', fontSize: '14px', iconSize: 16 },
};

const Button = React.forwardRef(({
    children,
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = '',
    disabled,
    onClick,
    type = 'button',
    ...rest
}, ref) => {
    const v = VARIANT_STYLES[variant] || VARIANT_STYLES.secondary;
    const s = SIZE_STYLES[size] || SIZE_STYLES.md;
    const isDisabled = disabled || loading;

    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: iconOnly ? s.height : s.height,
        width: iconOnly ? s.height : undefined,
        padding: iconOnly ? 0 : s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        fontFamily: 'var(--font-inter)',
        backgroundColor: v.bg,
        color: v.color,
        border: v.border || 'none',
        borderRadius: '6px',
        boxShadow: v.shadow || 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'filter 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
    };

    return (
        <motion.button
            ref={ref}
            type={type}
            style={baseStyle}
            className={className}
            disabled={isDisabled}
            onClick={onClick}
            whileTap={isDisabled ? {} : { scale: 0.95 }}
            whileHover={isDisabled ? {} : { filter: 'brightness(1.08)' }}
            {...rest}
        >
            {loading
                ? <Loader2 size={s.iconSize} className="animate-spin shrink-0" />
                : LeftIcon && <LeftIcon size={s.iconSize} className="shrink-0" />
            }
            {!iconOnly && children}
            {!loading && RightIcon && <RightIcon size={s.iconSize} className="shrink-0" />}
        </motion.button>
    );
});

Button.displayName = 'Button';
export default Button;
