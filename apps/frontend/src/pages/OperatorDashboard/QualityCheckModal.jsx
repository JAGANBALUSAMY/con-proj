import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import './QualityCheckModal.css';

const SEVERITY_OPTIONS = ['MINOR', 'MAJOR', 'CRITICAL'];

const emptyDefect = () => ({ defectCode: '', quantity: '', severity: 'MINOR' });

const QualityCheckModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [quantityIn, setQuantityIn] = useState('');
    const [defectiveQuantity, setDefectiveQuantity] = useState('');
    const [defects, setDefects] = useState([emptyDefect()]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');

    // Fetch quality summary when modal opens
    useEffect(() => {
        if (isOpen && batch) {
            setError('');
            setQuantityIn('');
            setDefectiveQuantity('');
            setDefects([emptyDefect()]);
            setStartTime('');
            setEndTime('');
            fetchSummary();
        }
    }, [isOpen, batch]);

    const fetchSummary = async () => {
        try {
            const res = await api.get(`/quality/batch/${batch.id}/summary`);
            setSummary(res.data);
        } catch {
            setSummary(null);
        }
    };

    // Derived: auto-compute defectiveQuantity from sum of defect rows
    const defectSum = defects.reduce((sum, d) => sum + (parseInt(d.quantity) || 0), 0);

    const handleDefectChange = (index, field, value) => {
        const updated = [...defects];
        updated[index] = { ...updated[index], [field]: value };
        setDefects(updated);
    };

    const addDefectRow = () => setDefects([...defects, emptyDefect()]);

    const removeDefectRow = (index) => {
        if (defects.length === 1) return;
        setDefects(defects.filter((_, i) => i !== index));
    };

    const validate = () => {
        const qIn = parseInt(quantityIn);
        const remaining = summary?.batch?.remaining ?? Infinity;

        if (!quantityIn || isNaN(qIn) || qIn <= 0) return 'Quantity inspected must be greater than 0.';
        if (qIn > remaining) return `Cannot inspect ${qIn} units. Only ${remaining} units remain uninspected.`;
        if (defectSum < 0 || defectSum > qIn) return `Total defect quantity (${defectSum}) cannot exceed quantity inspected (${qIn}).`;
        if (!startTime || !endTime) return 'Start time and end time are required.';
        if (new Date(endTime) < new Date(startTime)) return 'End time must be after start time.';

        for (const d of defects) {
            if (!d.defectCode.trim()) return 'Each defect must have a defect code.';
            if (!parseInt(d.quantity) || parseInt(d.quantity) <= 0) return 'Each defect quantity must be greater than 0.';
        }
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
            await api.post('/quality/record-defect', {
                batchId: batch.id,
                quantityIn: parseInt(quantityIn),
                defectiveQuantity: defectSum,
                defects: defects.map(d => ({
                    defectCode: d.defectCode.trim().toUpperCase(),
                    quantity: parseInt(d.quantity),
                    severity: d.severity
                })),
                startTime,
                endTime
            });

            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit quality check. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !batch) return null;

    const remaining = summary?.batch?.remaining;
    const alreadyInspected = summary?.batch?.alreadyInspected;

    return (
        <div className="qc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="qc-modal">
                {/* Header */}
                <div className="qc-header">
                    <div className="qc-header-title">
                        <ShieldAlert size={22} />
                        <div>
                            <h2>Quality Check</h2>
                            <p className="qc-batch-ref">{batch.batchNumber} · {batch.briefTypeName}</p>
                        </div>
                    </div>
                    <button className="qc-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Batch Quantity Context */}
                {summary && (
                    <div className="qc-context-bar">
                        <div className="qc-context-item">
                            <span className="ctx-label">Total</span>
                            <span className="ctx-value">{summary.batch.totalQuantity}</span>
                        </div>
                        <div className="qc-context-item">
                            <span className="ctx-label">Inspected</span>
                            <span className="ctx-value">{alreadyInspected}</span>
                        </div>
                        <div className="qc-context-item highlight">
                            <span className="ctx-label">Remaining</span>
                            <span className="ctx-value">{remaining}</span>
                        </div>
                        <div className="qc-context-item defective">
                            <span className="ctx-label">Defective</span>
                            <span className="ctx-value">{summary.batch.defectiveQuantity}</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="qc-form">
                    {/* Inspection Quantities */}
                    <div className="qc-section">
                        <h3 className="qc-section-title">Inspection Details</h3>
                        <div className="qc-row">
                            <div className="qc-field">
                                <label>Units Inspected *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={remaining}
                                    value={quantityIn}
                                    onChange={e => setQuantityIn(e.target.value)}
                                    placeholder={`Max: ${remaining ?? '...'}`}
                                    required
                                />
                            </div>
                            <div className="qc-field">
                                <label>Total Defective (auto-sum)</label>
                                <input
                                    type="number"
                                    value={defectSum}
                                    readOnly
                                    className="readonly-input"
                                    tabIndex={-1}
                                />
                            </div>
                        </div>
                        <div className="qc-row">
                            <div className="qc-field">
                                <label>Start Time *</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="qc-field">
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

                    {/* Defect Entries */}
                    <div className="qc-section">
                        <div className="qc-section-header">
                            <h3 className="qc-section-title">Defect Records</h3>
                            <button type="button" className="btn-add-defect" onClick={addDefectRow}>
                                <Plus size={16} /> Add Defect Type
                            </button>
                        </div>

                        <div className="defect-list">
                            {defects.map((defect, index) => (
                                <div key={index} className="defect-row">
                                    <div className="defect-field">
                                        <label>Defect Code</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. STITCH_LOOSE"
                                            value={defect.defectCode}
                                            onChange={e => handleDefectChange(index, 'defectCode', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="defect-field defect-qty">
                                        <label>Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="0"
                                            value={defect.quantity}
                                            onChange={e => handleDefectChange(index, 'quantity', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="defect-field">
                                        <label>Severity</label>
                                        <select
                                            value={defect.severity}
                                            onChange={e => handleDefectChange(index, 'severity', e.target.value)}
                                        >
                                            {SEVERITY_OPTIONS.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-remove-defect"
                                        onClick={() => removeDefectRow(index)}
                                        disabled={defects.length === 1}
                                        title="Remove this defect"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Live usable preview */}
                        {quantityIn && (
                            <div className="qc-preview">
                                <span>Usable from this session: <strong>{Math.max(0, parseInt(quantityIn) - defectSum)}</strong></span>
                                <span>Defective: <strong>{defectSum}</strong></span>
                            </div>
                        )}
                    </div>

                    {error && <div className="qc-error">{error}</div>}

                    <div className="qc-actions">
                        <button type="button" className="btn-qc-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-qc-submit" disabled={loading}>
                            <CheckCircle2 size={18} />
                            {loading ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QualityCheckModal;
