import React, { useState } from 'react';
import { X, Users, Shield, CheckCircle, Clock, Key, Power, LogOut } from 'lucide-react';
import api from '../../utils/api';
import './OperatorDetailModal.css';

const OperatorDetailModal = ({ operator, onClose, onUpdate }) => {
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!window.confirm('Verify this operator account?')) return;

        setLoading(true);
        try {
            await api.patch(`/users/${operator.id}/verify`);
            alert('Operator verified successfully');
            onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to verify operator');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword) {
            alert('Please enter a new password');
            return;
        }

        setLoading(true);
        try {
            await api.patch(`/users/${operator.id}/reset-operator-password`, { newPassword });
            alert('Password reset successfully');
            setIsResettingPassword(false);
            setNewPassword('');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = operator.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const confirmMessage = newStatus === 'INACTIVE'
            ? 'Are you sure you want to DEACTIVATE this operator account? They will not be able to login.'
            : 'Are you sure you want to ACTIVATE this operator account?';

        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        try {
            await api.patch(`/users/${operator.id}/operator-status`, { status: newStatus });
            alert(`Operator account ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
            onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const handleForceLogout = async () => {
        if (!window.confirm('Force logout this operator? They will need to re-authenticate.')) return;

        setLoading(true);
        try {
            await api.post(`/users/${operator.id}/force-operator-logout`);
            alert('Operator force logout successful');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to force logout');
        } finally {
            setLoading(false);
        }
    };

    const getVerificationIcon = () => {
        switch (operator.verificationStatus) {
            case 'VERIFIED':
                return <CheckCircle size={18} className="status-icon verified" />;
            case 'PENDING':
                return <Clock size={18} className="status-icon pending" />;
            default:
                return null;
        }
    };

    return (
        <div className="operator-detail-overlay">
            <div className="operator-detail-modal">
                {/* Header */}
                <div className="operator-detail-header">
                    <div className="header-title">
                        <Shield size={24} />
                        <div>
                            <h2>Operator Account Management</h2>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose} disabled={loading}>
                        <X size={20} />
                    </button>
                </div>

                {/* Operator Info */}
                <div className="operator-info-section">
                    <div className="info-row">
                        <span className="info-label">Full Name:</span>
                        <span className="info-value">{operator.fullName}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Employee Code:</span>
                        <span className="info-value">{operator.employeeCode}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Status:</span>
                        <span className={`status-badge ${operator.status?.toLowerCase()}`}>
                            {operator.status || 'ACTIVE'}
                        </span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Verification:</span>
                        <div className="verification-badge">
                            {getVerificationIcon()}
                            <span className={`verification-text ${operator.verificationStatus?.toLowerCase()}`}>
                                {operator.verificationStatus}
                            </span>
                        </div>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Assigned Sections:</span>
                        <div className="sections-chips">
                            {operator.sections && operator.sections.length > 0 ? (
                                operator.sections.map((section, index) => (
                                    <span key={index} className="section-chip">
                                        {section}
                                    </span>
                                ))
                            ) : (
                                <span className="no-sections">No sections assigned</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Password Reset */}
                {isResettingPassword && (
                    <div className="password-reset-section">
                        <h4>Reset Password</h4>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="password-input"
                        />
                        <div className="password-actions">
                            <button onClick={() => { setIsResettingPassword(false); setNewPassword(''); }}>
                                Cancel
                            </button>
                            <button onClick={handleResetPassword} disabled={loading}>
                                Confirm Reset
                            </button>
                        </div>
                    </div>
                )}

                {/* Governance Actions */}
                <div className="governance-actions">
                    {operator.verificationStatus === 'PENDING' && (
                        <button
                            className="action-btn verify-operator"
                            onClick={handleVerify}
                            disabled={loading}
                        >
                            <CheckCircle size={18} />
                            Verify Operator
                        </button>
                    )}

                    <button
                        className="action-btn reset-password"
                        onClick={() => setIsResettingPassword(!isResettingPassword)}
                        disabled={loading}
                    >
                        <Key size={18} />
                        Reset Password
                    </button>

                    <button
                        className={`action-btn toggle-status ${operator.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                        onClick={handleToggleStatus}
                        disabled={loading}
                    >
                        <Power size={18} />
                        {operator.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                    </button>

                    <button
                        className="action-btn force-logout"
                        onClick={handleForceLogout}
                        disabled={loading}
                    >
                        <LogOut size={18} />
                        Force Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OperatorDetailModal;
