import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Modal from '@frontend/components/UI/Modal';
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
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
                        Inspected Quantity (Total: {batch?.totalQuantity})
                    </label>
                    <input
                        type="number"
                        className="w-full p-3 rounded-xl bg-background border border-border text-sm font-bold"
                        value={inspectedQty}
                        onChange={(e) => setInspectedQty(parseInt(e.target.value))}
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">
                        Record Defects
                    </label>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {defectTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => handleAddDefect(type)}
                                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold hover:bg-primary/5 hover:border-primary/30 transition-all"
                            >
                                + {type}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {defects.map((d, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-xl bg-error/5 border border-error/20 items-center">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-error">{d.type}</p>
                                </div>
                                <input
                                    type="number"
                                    className="w-16 p-1 text-center rounded bg-white border border-border text-xs font-bold"
                                    value={d.quantity}
                                    onChange={(e) => handleUpdateDefect(i, 'quantity', parseInt(e.target.value))}
                                />
                                <select
                                    className="p-1 rounded bg-white border border-border text-[9px] font-bold"
                                    value={d.severity}
                                    onChange={(e) => handleUpdateDefect(i, 'severity', e.target.value)}
                                >
                                    <option value="MINOR">MINOR</option>
                                    <option value="MAJOR">MAJOR</option>
                                    <option value="CRITICAL">CRITICAL</option>
                                </select>
                                <button onClick={() => handleRemoveDefect(i)} className="text-slate-400 hover:text-error">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {defects.length === 0 && (
                            <div className="p-8 text-center rounded-xl bg-success/5 border border-success/20">
                                <CheckCircle2 className="mx-auto text-success mb-2" size={24} />
                                <p className="text-[10px] font-bold text-success uppercase">No defects recorded</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <button className="flex-1 py-3 px-4 border border-border rounded-xl text-xs font-bold" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="flex-3 py-3 px-6 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
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
