import React, { useState } from 'react';
import { X, Shield, Key, Power, LogOut, Edit } from 'lucide-react';
import SectionEditor from '../SectionEditor/SectionEditor';
import api from '../../utils/api';
import './ManagerDetailModal.css';

const ManagerDetailModal = ({ manager, onClose, onUpdate }) => {
    const [isEditingSections, setIsEditingSections] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdateSections = async (sections) => {
        setLoading(true);
        try {
            await api.patch(`/users/${manager.id}/sections`, { sections });
            alert('Sections updated successfully');
            setIsEditingSections(false);
            onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update sections');
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
            await api.patch(`/users/${manager.id}/reset-password`, { newPassword });
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
        const newStatus = manager.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const confirmMessage = newStatus === 'INACTIVE'
            ? 'Are you sure you want to DEACTIVATE this manager account? They will not be able to login.'
            : 'Are you sure you want to ACTIVATE this manager account?';

        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        try {
            await api.patch(`/users/${manager.id}/status`, { status: newStatus });
            alert(`Manager account ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
            onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const handleForceLogout = async () => {
        if (!window.confirm('Force logout this manager? They will need to re-authenticate.')) return;

        setLoading(true);
        try {
            await api.post(`/users/${manager.id}/force-logout`);
            alert('Manager force logout successful');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to force logout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="manager-detail-overlay">
            <div className="manager-detail-modal">
                {/* Header */}
                <div className="manager-detail-header">
                    <div className="header-title">
                        <Shield size={24} />
                        <div>
                            <h2>Manager Account Governance</h2>
                            <p className="header-subtitle">(Non-Production)</p>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose} disabled={loading}>
                        <X size={20} />
                    </button>
                </div>

                {/* Manager Info */}
                <div className="manager-info-section">
                    <div className="info-row">
                        <span className="info-label">Full Name:</span>
                        <span className="info-value">{manager.fullName}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Employee Code:</span>
                        <span className="info-value">{manager.employeeCode}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Status:</span>
                        <span className={`status-badge ${manager.status?.toLowerCase()}`}>
                            {manager.status || 'ACTIVE'}
                        </span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Current Sections:</span>
                        <div className="sections-chips">
                            {manager.sections && manager.sections.length > 0 ? (
                                manager.sections.map((section, index) => (
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

                {/* Section Editor */}
                {isEditingSections && (
                    <SectionEditor
                        currentSections={manager.sections || []}
                        onSave={handleUpdateSections}
                        onCancel={() => setIsEditingSections(false)}
                    />
                )}

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
                    <button
                        className="action-btn edit-sections"
                        onClick={() => setIsEditingSections(!isEditingSections)}
                        disabled={loading}
                    >
                        <Edit size={18} />
                        {isEditingSections ? 'Cancel Edit' : 'Edit Sections'}
                    </button>

                    <button
                        className="action-btn reset-password"
                        onClick={() => setIsResettingPassword(!isResettingPassword)}
                        disabled={loading}
                    >
                        <Key size={18} />
                        Reset Password
                    </button>

                    <button
                        className={`action-btn toggle-status ${manager.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                        onClick={handleToggleStatus}
                        disabled={loading}
                    >
                        <Power size={18} />
                        {manager.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
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

export default ManagerDetailModal;
