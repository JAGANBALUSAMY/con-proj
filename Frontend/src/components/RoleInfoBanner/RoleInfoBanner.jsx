import React from 'react';
import { Info } from 'lucide-react';
import './RoleInfoBanner.css';

const RoleInfoBanner = ({ role, message }) => {
    return (
        <div className="role-info-banner">
            <Info size={16} />
            <span>{message}</span>
        </div>
    );
};

export default RoleInfoBanner;
