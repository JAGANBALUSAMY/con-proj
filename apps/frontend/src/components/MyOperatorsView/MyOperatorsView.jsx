import React, { useState } from 'react';
import { X, Users, Settings } from 'lucide-react';
import UserCard from '../UserCard/UserCard';
import OperatorDetailModal from '../OperatorDetailModal/OperatorDetailModal';
import './MyOperatorsView.css';

const MyOperatorsView = ({ operators, onClose, onRefresh }) => {
    const [selectedOperator, setSelectedOperator] = useState(null);

    const handleManageClick = (operator) => {
        setSelectedOperator(operator);
    };

    const handleOperatorUpdate = () => {
        setSelectedOperator(null);
        if (onRefresh) {
            onRefresh();
        }
    };

    return (
        <div className="my-operators-overlay">
            <div className="my-operators-modal">
                {/* Header */}
                <div className="my-operators-header">
                    <div className="header-title">
                        <Users size={24} />
                        <h2>My Operators</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Operators Grid */}
                <div className="my-operators-content">
                    {operators.length === 0 ? (
                        <div className="empty-operators">
                            <Users size={48} className="empty-icon" />
                            <p>No operators found</p>
                            <span className="empty-hint">Create operators to manage them here</span>
                        </div>
                    ) : (
                        <div className="operators-grid">
                            {operators.map(operator => (
                                <UserCard
                                    key={operator.id}
                                    user={operator}
                                    onManage={handleManageClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedOperator && (
                <OperatorDetailModal
                    operator={selectedOperator}
                    onClose={() => setSelectedOperator(null)}
                    onUpdate={handleOperatorUpdate}
                />
            )}
        </div>
    );
};

export default MyOperatorsView;
