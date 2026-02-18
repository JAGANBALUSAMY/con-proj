import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Tag, CalendarClock } from 'lucide-react';
import api from '../../utils/api';
import './LabelingModal.css';

const LabelingModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setStartTime('');
            setEndTime('');
            setNotes('');
        }
    }, [isOpen]);

    if (!isOpen || !batch) return null;

    // "Only usable quantity enters labeling"
    const labelingQuantity = batch.usableQuantity;

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
                quantityIn: labelingQuantity, // Must match usable
                quantityOut: labelingQuantity, // Must not change
                startTime,
                endTime
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit labeling log. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="label-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="label-modal">
                {/* Header */}
                <div className="label-header">
                    <div className="label-header-title">
                        <Tag size={24} />
                        <div>
                            <h2>Labeling Station</h2>
                            <p className="label-batch-ref">{batch.batchNumber} · {batch.briefTypeName}</p>
                        </div>
                    </div>
                    <button className="label-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Batch Context */}
                <div className="label-context-bar">
                    <div className="label-context-item">
                        <span className="ctx-label">Batch Total</span>
                        <span className="ctx-value">{batch.totalQuantity}</span>
                    </div>
                    <div className="label-context-item active">
                        <span className="ctx-label">To Label (Usable)</span>
                        <span className="ctx-value">{labelingQuantity}</span>
                    </div>
                    <div className="label-context-item">
                        <span className="ctx-label">Defective / Scrapped</span>
                        <span className="ctx-value">{batch.defectiveQuantity} / {batch.scrappedQuantity}</span>
                    </div>
                </div>

                <div className="label-info-box">
                    <p><strong>Note:</strong> Labeling processes the entire usable quantity. Quantity cannot be changed at this stage.</p>
                </div>

                <form onSubmit={handleSubmit} className="label-form">
                    <div className="label-section">
                        <h3 className="label-section-title"><CalendarClock size={16} /> Execution Time</h3>
                        <div className="label-row">
                            <div className="label-field">
                                <label>Start Time *</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="label-field">
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

                    {error && <div className="label-error">{error}</div>}

                    <div className="label-actions">
                        <button type="button" className="btn-label-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-label-submit" disabled={loading}>
                            <CheckCircle2 size={18} />
                            {loading ? 'Submitting...' : 'Complete Labeling'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LabelingModal;
