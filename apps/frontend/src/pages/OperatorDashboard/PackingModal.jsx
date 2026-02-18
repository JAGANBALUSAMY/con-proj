import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Box, CalendarClock } from 'lucide-react';
import api from '../../utils/api';
import './PackingModal.css';

const PackingModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setStartTime('');
            setEndTime('');
        }
    }, [isOpen]);

    if (!isOpen || !batch) return null;

    // "Strictly Usable Quantity"
    const packingQuantity = batch.usableQuantity;

    const validate = () => {
        if (!startTime || !endTime) return 'Start time and end time are required.';
        if (new Date(endTime) < new Date(startTime)) return 'End time must be after start time.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            await api.post('/production/create', {
                batchId: batch.id,
                quantityIn: packingQuantity, // Must match usable
                quantityOut: packingQuantity, // Must match quantityIn (No reduction)
                startTime,
                endTime
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit packing log. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="packing-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="packing-modal">
                {/* Header */}
                <div className="packing-header">
                    <div className="packing-header-title">
                        <Box size={24} />
                        <div>
                            <h2>Packing Station</h2>
                            <p className="packing-batch-ref">{batch.batchNumber} · {batch.briefTypeName}</p>
                        </div>
                    </div>
                    <button className="packing-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Batch Context */}
                <div className="packing-context-bar">
                    <div className="packing-context-item">
                        <span className="ctx-label">Batch Total</span>
                        <span className="ctx-value">{batch.totalQuantity}</span>
                    </div>
                    <div className="packing-context-item active">
                        <span className="ctx-label">To Pack (Usable)</span>
                        <span className="ctx-value">{packingQuantity}</span>
                    </div>
                    <div className="packing-context-item">
                        <span className="ctx-label">Defective</span>
                        <span className="ctx-value">{batch.defectiveQuantity}</span>
                    </div>
                </div>

                <div className="packing-info-box">
                    <p><strong>Strict Rule:</strong> You must pack the <strong>exact usable quantity</strong> into one box. No quantity changes allowed.</p>
                </div>

                <form onSubmit={handleSubmit} className="packing-form">
                    <div className="packing-section">
                        <h3 className="packing-section-title"><CalendarClock size={16} /> Execution Time</h3>
                        <div className="packing-row">
                            <div className="packing-field">
                                <label>Start Time *</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="packing-field">
                                <label>End Time *</label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {error && <div className="packing-error">{error}</div>}

                    <div className="packing-actions">
                        <button type="button" className="btn-packing-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-packing-submit" disabled={loading}>
                            <CheckCircle2 size={18} />
                            {loading ? 'Submitting...' : 'Confirm Packing'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PackingModal;
