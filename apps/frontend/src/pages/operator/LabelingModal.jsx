import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Tag, Clock, CalendarClock } from 'lucide-react';
import api from '../../utils/api';
import './LabelingModal.css';

const LabelingModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [startTime, setStartTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setStartTime(null);
            setNotes('');
        }
    }, [isOpen]);

    const handleStartWork = () => {
        setStartTime(new Date().toISOString());
    };

    if (!isOpen || !batch) return null;

    // "Only usable quantity enters labeling"
    const labelingQuantity = batch.usableQuantity;

    const validate = (endTime) => {
        if (!startTime) return 'Please click "Start Work" before completing.';
        if (new Date(endTime) < new Date(startTime)) return 'System time error: End time is before start time.';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const endTime = new Date().toISOString();
        const validationError = validate(endTime);
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            await api.post('/production/log', {
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

                <form onSubmit={handleSubmit} className="label-form">
                    <div className="label-body">
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

                        <div className="label-section">
                            <h3 className="label-section-title"><CalendarClock size={16} /> Work Session</h3>

                            <div className="work-timer-section" style={{ borderStyle: 'solid', borderColor: '#e2e8f0', background: '#f8fafc', margin: '1rem 0' }}>
                                {!startTime ? (
                                    <button
                                        type="button"
                                        className="btn-start-work"
                                        onClick={handleStartWork}
                                    >
                                        <Clock size={20} /> Start Work
                                    </button>
                                ) : (
                                    <div className="start-time-display">
                                        <Clock size={16} /> Started at: {new Date(startTime).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && <div className="label-error">{error}</div>}
                    </div>

                    <div className="label-actions">
                        <button type="button" className="btn-label-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-label-submit" disabled={loading || !startTime}>
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
