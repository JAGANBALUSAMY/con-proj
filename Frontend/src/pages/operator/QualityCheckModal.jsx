import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import api from '@frontend/services/api';
import './QualityCheckModal.css';

const SEVERITY_OPTIONS = ['MINOR', 'MAJOR', 'CRITICAL'];

const DEFECT_CATALOG = [
    { code: 'CUT_MISMATCH', label: 'Cutting: Mismatch', stage: 'CUTTING' },
    { code: 'CUT_DEVIATION', label: 'Cutting: Deviation', stage: 'CUTTING' },
    { code: 'FABRIC_DAMAGE', label: 'Cutting: Fabric Damage', stage: 'CUTTING' },
    { code: 'PATTERN_ERROR', label: 'Cutting: Pattern Error', stage: 'CUTTING' },
    { code: 'STITCH_LOOSE', label: 'Stitching: Loose Stitch', stage: 'STITCHING' },
    { code: 'STITCH_MISALIGNED', label: 'Stitching: Misaligned', stage: 'STITCHING' },
    { code: 'STITCH_SKIP', label: 'Stitching: Skipped Stitch', stage: 'STITCHING' },
    { code: 'THREAD_BREAK', label: 'Stitching: Thread Break', stage: 'STITCHING' },
    { code: 'SEAM_PUCKERING', label: 'Stitching: Seam Puckering', stage: 'STITCHING' },
];

const emptyDefect = () => {
    const firstDefect = DEFECT_CATALOG[0];
    return {
        defectCode: firstDefect.code,
        quantity: '',
        severity: 'MINOR',
        reworkStage: firstDefect.stage
    };
};

const QualityCheckModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [quantityIn, setQuantityIn] = useState('');
    const [defectiveQuantity, setDefectiveQuantity] = useState('');
    const [defects, setDefects] = useState([emptyDefect()]);
    const [startTime, setStartTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [qcPool, setQcPool] = useState('initial'); // 'initial' or 're-qc'
    const [error, setError] = useState('');

    // Fetch quality summary when modal opens
    useEffect(() => {
        if (isOpen && batch) {
            setError('');
            setQuantityIn('');
            setDefectiveQuantity('');
            setDefects([emptyDefect()]);
            setStartTime(null);
            setQcPool('initial');
            fetchSummary();
        }
    }, [isOpen, batch]);

    const handleStartWork = () => {
        setStartTime(new Date().toISOString());
    };

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

    const validate = (endTime) => {
        const qIn = parseInt(quantityIn);
        const remainingToQC = summary?.batch?.remainingToQC ?? 0;
        const reworkedPending = summary?.batch?.reworkedPending ?? 0;

        if (!quantityIn || isNaN(qIn) || qIn <= 0) return 'Quantity inspected must be greater than 0.';

        if (qcPool === 'initial') {
            if (qIn !== remainingToQC) return `Initial QC must process ALL remaining units (${remainingToQC}). Mixing pools is forbidden.`;
        } else {
            if (qIn !== reworkedPending) return `Re-QC must process ALL cured units (${reworkedPending}). Mixing pools is forbidden.`;
        }

        if (defectSum < 0 || defectSum > qIn) return `Total defect quantity (${defectSum}) cannot exceed quantity inspected (${qIn}).`;
        if (!startTime) return 'Please click "Start Work" before submitting.';
        if (new Date(endTime) < new Date(startTime)) return 'System time error: End time is before start time.';

        for (const d of defects) {
            if (!d.defectCode.trim()) return 'Each defect must have a defect code.';
            if (!parseInt(d.quantity) || parseInt(d.quantity) <= 0) return 'Each defect quantity must be greater than 0.';
        }
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
            await api.post('/quality/record-defect', {
                batchId: batch.id,
                quantityIn: parseInt(quantityIn),
                defectiveQuantity: defectSum,
                defects: defects.map(d => {
                    const defectInfo = DEFECT_CATALOG.find(cat => cat.code === d.defectCode);
                    return {
                        defectCode: d.defectCode,
                        quantity: parseInt(d.quantity),
                        severity: d.severity,
                        stage: 'QUALITY_CHECK',
                        reworkStage: d.reworkStage
                    };
                }),
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

                {/* Batch Quantity Context (Ledger Model) */}
                {summary && (
                    <div className="qc-context-bar">
                        <div className="qc-context-item">
                            <span className="ctx-label">Batch Total</span>
                            <span className="ctx-value" title={`Original Batch Total: ${summary.batch.originalTotal}`}>{summary.batch.survivingTotal}</span>
                        </div>
                        <div className="qc-context-item highlight-success">
                            <span className="ctx-label">Cleared</span>
                            <span className="ctx-value" title="Units that passed QC">{summary.batch.qcCleared}</span>
                        </div>
                        <div className="qc-context-item highlight-info">
                            <span className="ctx-label">Cured</span>
                            <span className="ctx-value" title="Units waiting for Re-QC">{summary.batch.reworkedPending}</span>
                        </div>
                        <div className="qc-context-item highlight-warning">
                            <span className="ctx-label">New Units</span>
                            <span className="ctx-value" title="Units never inspected">{summary.batch.remainingToQC}</span>
                        </div>
                        <div className="qc-context-item defective">
                            <span className="ctx-label">Defective</span>
                            <span className="ctx-value" title="Units currently in rework state">{summary.batch.defective}</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="qc-form">
                    <div className="qc-body">
                        {/* Inspection Quantities */}
                        <div className="qc-section">
                            <h3 className="qc-section-title">Inspection Selection</h3>

                            {summary?.batch?.remainingToQC === 0 && summary?.batch?.reworkedPending === 0 ? (
                                <div className="qc-complete-msg">
                                    <CheckCircle2 size={24} color="#10b981" />
                                    <div>
                                        <strong>Batch Fully Cleared</strong>
                                        <p>All units in this batch have successfully passed quality check.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="pool-selector">
                                        <button
                                            type="button"
                                            className={`pool-btn ${qcPool === 'initial' ? 'active' : ''}`}
                                            onClick={() => {
                                                setQcPool('initial');
                                                setQuantityIn(summary?.batch?.remainingToQC || '');
                                            }}
                                            disabled={summary?.batch?.remainingToQC === 0}
                                        >
                                            Inspect New Units ({summary?.batch?.remainingToQC})
                                        </button>
                                        <button
                                            type="button"
                                            className={`pool-btn ${qcPool === 're-qc' ? 'active' : ''}`}
                                            onClick={() => {
                                                setQcPool('re-qc');
                                                setQuantityIn(summary?.batch?.reworkedPending || '');
                                            }}
                                            disabled={summary?.batch?.reworkedPending === 0}
                                        >
                                            Re-QC Cured Units ({summary?.batch?.reworkedPending})
                                        </button>
                                    </div>

                                    <div className="work-timer-section" style={{ borderStyle: 'solid', borderColor: '#e2e8f0', background: '#f8fafc', marginTop: '1rem' }}>
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

                                    <div className="qc-row">
                                        <div className="qc-field">
                                            <label>Units Being Inspected *</label>
                                            <input
                                                type="number"
                                                value={quantityIn}
                                                readOnly
                                                className="readonly-input"
                                                placeholder="Select a pool above"
                                                required
                                            />
                                            <p className="field-hint" style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                                                Rule: You must inspect the entire selected pool at once.
                                            </p>
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
                                </>
                            )}
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
                                            <label>Defect Type</label>
                                            <select
                                                value={defect.defectCode}
                                                onChange={e => handleDefectChange(index, 'defectCode', e.target.value)}
                                                required
                                            >
                                                {DEFECT_CATALOG.map(cat => (
                                                    <option key={cat.code} value={cat.code}>
                                                        {cat.label}
                                                    </option>
                                                ))}
                                            </select>
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
                                            <label>Rework Section</label>
                                            <select
                                                value={defect.reworkStage}
                                                onChange={e => handleDefectChange(index, 'reworkStage', e.target.value)}
                                                required
                                            >
                                                <option value="STITCHING">Stitching</option>
                                                <option value="CUTTING">Cutting</option>
                                            </select>
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
                    </div>

                    <div className="qc-actions">
                        <button type="button" className="btn-qc-cancel" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-qc-submit" disabled={loading || !startTime}>
                            <CheckCircle2 size={18} />
                            {loading ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
};

export default QualityCheckModal;
