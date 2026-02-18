import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Shirt, CalendarClock } from 'lucide-react';
import api from '../../utils/api';
import './FoldingModal.css';

const FoldingModal = ({ isOpen, onClose, batch, onSuccess }) => {
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

    // "Only usable quantity enters folding"
    const foldingQuantity = batch.usableQuantity;

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
                quantityIn: foldingQuantity, // Must match usable
                quantityOut: foldingQuantity, // Must not change
                startTime,
                endTime
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit folding log. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="folding-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="folding-modal">
                {/* Header */}
                <div className="folding-header">
                    <div className="folding-header-title">
                        <Shirt size={24} />
                        <div>
                            <h2>Folding Station</h2>
                            <p className="folding-batch-ref">{batch.batchNumber} · {batch.briefTypeName}</p>
                        </div>
                    </div>
                    <button className="folding-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Batch Context */}
                <div className="folding-context-bar">
                    <div className="folding-context-item">
                        <span className="ctx-label">Batch Total</span>
                        <span className="ctx-value">{batch.totalQuantity}</span>
                    </div>
                    <div className="folding-context-item active">
                        <span className="ctx-label">To Fold (Usable)</span>
                        <span className="ctx-value">{foldingQuantity}</span>
                    </div>
                    <div className="folding-context-item">
                        <span className="ctx-label">Defective</span>
                        <span className="ctx-value">{batch.defectiveQuantity}</span>
                    </div>
                </div>

                <div className="folding-info-box">
                    <p><strong>Note:</strong> Folding processes the entire usable quantity. Quantity cannot be changed at this stage.</p>
                </div>

                <form onSubmit={handleSubmit} className="folding-form">
                    <div className="folding-section">
                        <h3 className="folding-section-title"><CalendarClock size={16} /> Execution Time</h3>
                        <div className="folding-row">
                            <div className="folding-field">
                                <label>Start Time *</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="folding-field">
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

                    {error && <div className="folding-error">{error}</div>}

                    <div className="folding-actions">
                        <button type="button" className="btn-folding-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-folding-submit" disabled={loading}>
                            <CheckCircle2 size={18} />
                            {loading ? 'Submitting...' : 'Complete Folding'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FoldingModal;
