import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Modal from '@frontend/components/ui/Modal';
import api from '@frontend/services/api';

const QCInspectionModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [defects, setDefects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inspectedQty, setInspectedQty] = useState(batch?.totalQuantity || 0);

    const defectTypes = [
        'Stitching Error',
        'Fabric Flaw',
        'Measurement Mismatch',
        'Color Variance',
        'Finishing Issue'
    ];

    const handleAddDefect = (type) => {
        setDefects([...defects, { type, quantity: 1, severity: 'MINOR' }]);
    };

    const handleUpdateDefect = (index, field, value) => {
        const newDefects = [...defects];
        newDefects[index][field] = value;
        setDefects(newDefects);
    };

    const handleRemoveDefect = (index) => {
        setDefects(defects.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            await api.post(`/batches/${batch.id}/qc-report`, {
                inspectedQuantity: inspectedQty,
                defects: defects
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('QC submission failed:', error);
            alert('Failed to submit QC report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`QC Inspection: ${batch?.batchNumber}`}>
            <div className="space-y-6">
                <div>
                    <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bs-text-muted)', marginBottom: '8px', display: 'block' }}>
                        Inspected Quantity (Total: {batch?.totalQuantity})
                    </label>
                    <input
                        type="number"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bs-background)', border: '1px solid var(--bs-border)', fontSize: '14px', fontWeight: 700, color: 'var(--bs-text-primary)', outline: 'none' }}
                        value={inspectedQty}
                        onChange={(e) => setInspectedQty(parseInt(e.target.value))}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bs-text-muted)', marginBottom: '16px', display: 'block' }}>
                        Record Defects
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                        {defectTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => handleAddDefect(type)}
                                style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bs-background)', border: '1px solid var(--bs-border)', fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bs-brand)'; e.currentTarget.style.color = 'var(--bs-brand)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bs-border)'; e.currentTarget.style.color = 'var(--bs-text-secondary)'; }}
                            >
                                + {type}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {defects.map((d, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bs-danger)', margin: 0 }}>{d.type}</p>
                                </div>
                                <input
                                    type="number"
                                    style={{ width: '56px', padding: '4px', textAlign: 'center', borderRadius: '6px', background: 'var(--bs-background)', border: '1px solid var(--bs-border)', fontSize: '12px', fontWeight: 700, color: 'var(--bs-text-primary)', outline: 'none' }}
                                    value={d.quantity}
                                    onChange={(e) => handleUpdateDefect(i, 'quantity', parseInt(e.target.value))}
                                />
                                <select
                                    style={{ padding: '4px', borderRadius: '6px', background: 'var(--bs-background)', border: '1px solid var(--bs-border)', fontSize: '9px', fontWeight: 700, color: 'var(--bs-text-primary)', outline: 'none' }}
                                    value={d.severity}
                                    onChange={(e) => handleUpdateDefect(i, 'severity', e.target.value)}
                                >
                                    <option value="MINOR">MINOR</option>
                                    <option value="MAJOR">MAJOR</option>
                                    <option value="CRITICAL">CRITICAL</option>
                                </select>
                                <button onClick={() => handleRemoveDefect(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bs-text-muted)', padding: '2px' }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--bs-danger)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--bs-text-muted)'}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {defects.length === 0 && (
                            <div style={{ padding: '32px', textAlign: 'center', borderRadius: '12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
                                <CheckCircle2 style={{ margin: '0 auto', color: 'var(--bs-success)', marginBottom: '8px', display: 'block' }} size={24} />
                                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-success)', textTransform: 'uppercase', margin: 0 }}>No defects recorded</p>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                    <button
                        style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--bs-border)', borderRadius: '12px', background: 'transparent', fontSize: '12px', fontWeight: 700, color: 'var(--bs-text-secondary)', cursor: 'pointer' }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        style={{ flex: 3, padding: '12px 24px', borderRadius: '12px', background: 'var(--bs-brand)', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.3)', opacity: isSubmitting ? 0.6 : 1 }}
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? 'Processing...' : 'Submit QC Report'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default QCInspectionModal;
