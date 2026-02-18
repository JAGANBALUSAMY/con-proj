import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './ReworkLogModal.css';

const ReworkLogModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const { user } = useAuth();
    const assignedSection = user?.sections?.[0] || 'STITCHING';

    const [reworkStage, setReworkStage] = useState(assignedSection);
    const [quantity, setQuantity] = useState('');
    const [curedQuantity, setCuredQuantity] = useState('');
    const [scrappedQuantity, setScrappedQuantity] = useState('');
    const [startTime, setStartTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');

    // Reset when modal opens
    useEffect(() => {
        if (isOpen && batch) {
            setError('');
            setQuantity('');
            setCuredQuantity('');
            setScrappedQuantity('');
            setStartTime(null);
            setReworkStage(assignedSection);
            fetchSummary();
        }
    }, [isOpen, batch, assignedSection]);

    const fetchSummary = async () => {
        try {
            const res = await api.get(`/quality/batch/${batch.id}/summary`);
            setSummary(res.data);
        } catch {
            setSummary(null);
        }
    };

    const handleStartWork = () => {
        setStartTime(new Date().toISOString());
    };

    // Auto-calculate logic (optional helper)
    // If user enters Total and Cured, auto-calc Scrapped
    useEffect(() => {
        const q = parseInt(quantity);
        const c = parseInt(curedQuantity);
        if (!isNaN(q) && !isNaN(c) && q >= c) {
            setScrappedQuantity(q - c);
        }
    }, [quantity, curedQuantity]);

    const validate = (endTime) => {
        const q = parseInt(quantity);
        const c = parseInt(curedQuantity);
        const s = parseInt(scrappedQuantity);

        if (!batch) return 'No batch selected.';
        if (!quantity || q <= 0) return 'Rework quantity must be greater than 0.';
        if (q > batch.defectiveQuantity) return `Cannot rework ${q} units. Only ${batch.defectiveQuantity} defective units available.`;

        if (isNaN(c) || c < 0) return 'Cured quantity invalid.';
        if (isNaN(s) || s < 0) return 'Scrapped quantity invalid.';

        if (c + s !== q) return `Cured (${c}) + Scrapped (${s}) must equal Total Reworked (${q}).`;

        if (!startTime) return 'Please click "Start Work" before submitting.';
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
            await api.post('/rework/create', {
                batchId: batch.id,
                reworkStage,
                quantity: parseInt(quantity),
                curedQuantity: parseInt(curedQuantity),
                scrappedQuantity: parseInt(scrappedQuantity),
                startTime,
                endTime
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit rework log.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !batch) return null;

    return (
        <div className="rework-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rework-modal">
                <div className="rework-header">
                    <div className="rework-header-title">
                        <RefreshCw size={22} className="icon-spin" />
                        <div>
                            <h2>Log Rework</h2>
                            <p className="rework-batch-ref">{batch.batchNumber} · {batch.briefTypeName}</p>
                        </div>
                    </div>
                    <button className="rework-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="rework-context">
                    <div className="ctx-item">
                        <label>Defective Pool</label>
                        <span>{batch.defectiveQuantity}</span>
                    </div>
                    <div className="ctx-info">
                        <AlertTriangle size={14} />
                        You are processing items from the defective pool.
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="rework-form">
                    <div className="rework-body">
                        <div className="work-timer-section" style={{ borderStyle: 'solid', borderColor: '#e2e8f0', background: '#f8fafc' }}>
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

                        <div className="form-group">
                            <label>Rework Section</label>
                            <div className="static-field-value">
                                <Wrench size={14} />
                                <span>{assignedSection} ({summary?.batch?.defectCountByStage?.[assignedSection] || 0} defects available)</span>
                            </div>
                            <small>Rework is routed directly back to the origin section.</small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Total Reworked *</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    max={batch.defectiveQuantity}
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="text-success">Cured (Fixed) *</label>
                                <input
                                    type="number"
                                    value={curedQuantity}
                                    onChange={e => setCuredQuantity(e.target.value)}
                                    min="0"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-danger">Scrapped (Failed) *</label>
                                <input
                                    type="number"
                                    value={scrappedQuantity}
                                    onChange={e => setScrappedQuantity(e.target.value)}
                                    min="0"
                                    required
                                    readOnly // Auto-calc makes it safer, but let's allow manual if needed? No, auto-calc is better UX.
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                            </div>
                        </div>

                        {error && <div className="rework-error">{error}</div>}
                    </div>

                    <div className="rework-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading || !startTime}>
                            <CheckCircle2 size={18} />
                            {loading ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReworkLogModal;
