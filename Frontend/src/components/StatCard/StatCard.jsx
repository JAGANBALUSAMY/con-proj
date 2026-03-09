import React from 'react';
import './StatCard.css';

const StatCard = ({ icon: Icon, iconColor, label, value }) => {
    return (
        <div className="stat-card">
            <Icon size={24} color={iconColor} />
            <div className="stat-info">
                <span className="stat-label">{label}</span>
                <span className="stat-value">{value}</span>
            </div>
        </div>
    );
};

export default StatCard;
