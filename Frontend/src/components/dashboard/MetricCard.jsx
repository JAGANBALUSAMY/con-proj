// MetricCard — thin wrapper over ui/StatCard for backward compat
import React from 'react';
import StatCard from '@frontend/components/ui/StatCard';

const COLOR_TO_ACCENT = {
    primary: 'brand',
    success: 'success',
    warning: 'warning',
    error: 'danger',
    neutral: 'brand',
};

const MetricCard = ({ title, value, icon, trend, trendValue, color = 'primary', index = 0 }) => {
    const delta = trendValue ? parseFloat(String(trendValue).replace(/[^0-9.-]/g, '')) : undefined;
    const signedDelta = trend === 'up' ? Math.abs(delta) : trend === 'down' ? -Math.abs(delta) : undefined;

    return (
        <StatCard
            icon={icon}
            label={title}
            value={value}
            delta={signedDelta}
            accent={COLOR_TO_ACCENT[color] || 'brand'}
            index={index}
        />
    );
};

export default MetricCard;
