import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import './TransferRequestsView.css';

const TransferRequestsView = ({ incoming, outgoing, history, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [activeTab, setActiveTab] = useState('incoming'); // 'incoming', 'outgoing', or 'history'

    const handleAccept = async (transferId) => {
        if (!confirm('Accept this section transfer request?')) return;

        setLoading(true);
        try {
            await api.patch(`/section-transfers/${transferId}/review`, {
                action: 'ACCEPT'
            });
            alert('Transfer request accepted successfully');
            onRefresh();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to accept transfer');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (transferId) => {
        setLoading(true);
        try {
            await api.patch(`/section-transfers/${transferId}/review`, {
                action: 'REJECT',
                rejectionReason
            });
            alert('Transfer request rejected');
            setShowRejectModal(null);
            setRejectionReason('');
            onRefresh();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reject transfer');
        } finally {
            setLoading(false);
        }
    };

    const currentTransfers = activeTab === 'incoming'
        ? incoming
        : activeTab === 'outgoing'
            ? outgoing
            : history;

    return (
        <div className="transfer-requests-overlay">
            <div className="transfer-requests-modal">
                <div className="transfer-requests-header">
                    <div className="header-title">
                        <Clock size={24} />
                        <h2>Operator Section Transfers</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="transfer-tabs">
                    <button
                        className={`tab-button ${activeTab === 'incoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('incoming')}
                    >
                        Incoming Requests ({incoming.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'outgoing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('outgoing')}
                    >
                        My Sent Requests ({outgoing.length})
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Resolved History ({history.length})
                    </button>
                </div>

                <div className="transfer-requests-content">
                    {currentTransfers.length === 0 ? (
                        <div className="empty-transfers">
                            <Clock size={48} className="empty-icon" />
                            <p>No {activeTab === 'history' ? 'resolved' : activeTab} transfer requests</p>
                        </div>
                    ) : (
                        <div className="transfers-list">
                            {currentTransfers.map(transfer => (
                                <div key={transfer.id} className="transfer-card">
                                    <div className="transfer-info">
                                        <div className="transfer-card-header">
                                            <div className="operator-info">
                                                <h4>{transfer.operator.fullName}</h4>
                                                <span className="employee-code">{transfer.operator.employeeCode}</span>
                                            </div>
                                            {(activeTab === 'outgoing' || activeTab === 'history') && (
                                                <span className={`status-badge ${transfer.status.toLowerCase()}`}>
                                                    {transfer.status}
                                                </span>
                                            )}
                                        </div>

                                        <div className="section-transfer-flow">
                                            <span className="section-badge from">{transfer.fromSection}</span>
                                            <ArrowRight size={20} className="arrow" />
                                            <span className="section-badge to">{transfer.toSection}</span>
                                        </div>

                                        <div className="requester-info">
                                            <span className="label">
                                                {activeTab === 'incoming' ? 'Requested by:' : 'Target Manager:'}
                                            </span>
                                            <span className="value">
                                                {activeTab === 'incoming'
                                                    ? `${transfer.requester.fullName} (${transfer.requester.employeeCode})`
                                                    : `${transfer.targetManager.fullName} (${transfer.targetManager.employeeCode})`
                                                }
                                            </span>
                                        </div>

                                        {activeTab === 'history' && transfer.resolver && (
                                            <div className="requester-info">
                                                <span className="label">Resolved by:</span>
                                                <span className="value">{transfer.resolver.fullName}</span>
                                            </div>
                                        )}

                                        {transfer.rejectionReason && (activeTab === 'outgoing' || activeTab === 'history') && (
                                            <div className="rejection-info">
                                                <span className="label">Rejection Reason:</span>
                                                <span className="value">{transfer.rejectionReason}</span>
                                            </div>
                                        )}

                                        <div className="request-date">
                                            <span className="label">
                                                {activeTab === 'history' ? 'Resolved:' : 'Requested:'}
                                            </span>
                                            <span className="value">
                                                {new Date(activeTab === 'history' ? transfer.resolvedAt : transfer.requestedAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {activeTab === 'incoming' && (
                                        <div className="transfer-actions">
                                            <button
                                                className="btn-accept"
                                                onClick={() => handleAccept(transfer.id)}
                                                disabled={loading}
                                            >
                                                <CheckCircle size={18} />
                                                Accept
                                            </button>
                                            <button
                                                className="btn-reject"
                                                onClick={() => setShowRejectModal(transfer.id)}
                                                disabled={loading}
                                            >
                                                <XCircle size={18} />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showRejectModal && (
                <div className="reject-modal-overlay">
                    <div className="reject-modal">
                        <h3>Reject Transfer Request</h3>
                        <textarea
                            placeholder="Reason for rejection (optional)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                        />
                        <div className="reject-modal-actions">
                            <button onClick={() => setShowRejectModal(null)} className="btn-cancel">
                                Cancel
                            </button>
                            <button onClick={() => handleReject(showRejectModal)} className="btn-confirm-reject">
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransferRequestsView;
