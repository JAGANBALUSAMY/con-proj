import React from 'react';
import './ActionCard.css';

const ActionCard = ({ icon: Icon, label, onClick }) => {
    return (
        <button className="action-card" onClick={onClick}>
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );
};

export default ActionCard;
