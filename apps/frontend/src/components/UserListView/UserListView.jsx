import React, { useState } from 'react';
import { X, Users, Shield, Wrench } from 'lucide-react';
import UserCard from '../UserCard/UserCard';
import ManagerDetailModal from '../ManagerDetailModal/ManagerDetailModal';
import './UserListView.css';

const UserListView = ({ users, onClose, onRefresh }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [selectedManager, setSelectedManager] = useState(null);

    const filterUsers = () => {
        switch (activeTab) {
            case 'managers':
                return users.filter(u => u.role === 'MANAGER');
            case 'operators':
                return users.filter(u => u.role === 'OPERATOR');
            default:
                return users.filter(u => u.role !== 'ADMIN'); // Exclude ADMIN from list
        }
    };

    const filteredUsers = filterUsers();

    const getTabCount = (role) => {
        if (role === 'all') {
            return users.filter(u => u.role !== 'ADMIN').length;
        }
        // role parameter is lowercase ('managers', 'operators'), need to map to uppercase
        const roleMap = {
            'managers': 'MANAGER',
            'operators': 'OPERATOR'
        };
        return users.filter(u => u.role === roleMap[role]).length;
    };

    const handleManageClick = (manager) => {
        setSelectedManager(manager);
    };

    const handleManagerUpdate = () => {
        setSelectedManager(null);
        if (onRefresh) {
            onRefresh();
        }
    };

    return (
        <div className="user-list-overlay">
            <div className="user-list-modal">
                {/* Header */}
                <div className="user-list-header">
                    <div className="header-title">
                        <Users size={24} />
                        <h2>User Management</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="user-list-tabs">
                    <button
                        className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        <Users size={16} />
                        All Users
                        <span className="tab-count">{getTabCount('all')}</span>
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'managers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('managers')}
                    >
                        <Shield size={16} />
                        Managers
                        <span className="tab-count">{getTabCount('managers')}</span>
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'operators' ? 'active' : ''}`}
                        onClick={() => setActiveTab('operators')}
                    >
                        <Wrench size={16} />
                        Operators
                        <span className="tab-count">{getTabCount('operators')}</span>
                    </button>
                </div>

                {/* User Grid */}
                <div className="user-list-content">
                    {filteredUsers.length === 0 ? (
                        <div className="empty-users">
                            <Users size={48} className="empty-icon" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className="user-grid">
                            {filteredUsers.map(user => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    onManage={handleManageClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedManager && (
                <ManagerDetailModal
                    manager={selectedManager}
                    onClose={() => setSelectedManager(null)}
                    onUpdate={handleManagerUpdate}
                />
            )}
        </div>
    );
};

export default UserListView;
