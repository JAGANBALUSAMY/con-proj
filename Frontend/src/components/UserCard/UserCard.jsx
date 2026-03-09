import React from 'react';
import { CheckCircle, Clock, Calendar, Settings } from 'lucide-react';
import './UserCard.css';

const UserCard = ({ user, onManage }) => {
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'MANAGER':
                return 'role-badge manager';
            case 'OPERATOR':
                return 'role-badge operator';
            case 'ADMIN':
                return 'role-badge admin';
            default:
                return 'role-badge';
        }
    };

    const getVerificationIcon = (status) => {
        switch (status) {
            case 'VERIFIED':
                return <CheckCircle size={16} className="status-icon verified" />;
            case 'PENDING':
                return <Clock size={16} className="status-icon pending" />;
            default:
                return null;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="user-card">
            <div className="user-card-header">
                <span className={getRoleBadgeClass(user.role)}>{user.role}</span>
                <div className="verification-status">
                    {getVerificationIcon(user.verificationStatus)}
                    <span className={`status-text ${user.verificationStatus.toLowerCase()}`}>
                        {user.verificationStatus}
                    </span>
                </div>
            </div>

            <div className="user-card-body">
                <h4 className="user-name">{user.fullName}</h4>
                <p className="user-code">{user.employeeCode}</p>

                {user.sections && user.sections.length > 0 && (
                    <div className="sections-container">
                        <span className="sections-label">Sections:</span>
                        <div className="sections-chips">
                            {user.sections.map((section, index) => (
                                <span key={index} className="section-chip">
                                    {section}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="user-card-footer">
                <div className="footer-left">
                    <Calendar size={14} />
                    <span className="created-date">Created {formatDate(user.createdAt)}</span>
                </div>
                {onManage && (user.role === 'MANAGER' || user.role === 'OPERATOR') && (
                    <button className="manage-btn" onClick={() => onManage(user)}>
                        <Settings size={14} />
                        Manage
                    </button>
                )}
            </div>
        </div>
    );
};

export default UserCard;
