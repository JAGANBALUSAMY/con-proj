import React from 'react';
import './EmptyState.css';

const EmptyState = ({ icon: Icon, message }) => {
    return (
        <div className="empty-state">
            <Icon size={48} className="empty-state-icon" />
            <p>{message}</p>
        </div>
    );
};

export default EmptyState;
