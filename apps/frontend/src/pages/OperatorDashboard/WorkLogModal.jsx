import React, { useState, useEffect } from 'react';
import { X, Clock, Package, Wrench } from 'lucide-react';
import api from '../../utils/api';
import '../../styles/modal.css';

const WorkLogModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [formData, setFormData] = useState({
        quantityIn: '',
        quantityOut: '',
        machineId: '',
        notes: ''
    });
    const [startTime, setStartTime] = useState(null);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && batch) {
            setFormData({
                quantityIn: batch.usableQuantity || batch.totalQuantity || '',
                quantityOut: '',
                machineId: '',
                notes: ''
            });
            setStartTime(null);
        }
    }, [isOpen, batch]);

    const handleStartWork = () => {
        setStartTime(new Date().toISOString());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!startTime) {
            setError('Please click "Start Work" before submitting.');
            return;
        }

        setLoading(true);
        setError('');

        const endTime = new Date().toISOString();

        // Validate end time >= start time (safety check)
        if (new Date(endTime) < new Date(startTime)) {
            setError('System time error: End time is before start time.');
            setLoading(false);
            return;
        }

        // Validate Quantity Out <= Quantity In
        if (formData.quantityIn && formData.quantityOut) {
            if (parseInt(formData.quantityOut) > parseInt(formData.quantityIn)) {
                setError('Output quantity cannot exceed Input quantity');
                setLoading(false);
                return;
            }
        }

        try {
            await api.post('/production/log', {
                batchId: batch.id,
                startTime: startTime,
                endTime: endTime,
                quantityIn: parseInt(formData.quantityIn) || null,
                quantityOut: parseInt(formData.quantityOut) || null,
                machineId: formData.machineId ? parseInt(formData.machineId) : null,
                notes: formData.notes || null
            });

            alert('Work logged successfully! Awaiting manager approval.');
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to log work');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !batch) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><Package size={24} /> Log Work: {batch.batchNumber}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body">
                        {error && <div className="error-banner">{error}</div>}

                        <div className="info-box">
                            <p><strong>Batch:</strong> {batch.batchNumber} - {batch.briefTypeName}</p>
                            <p><strong>Stage:</strong> {batch.currentStage}</p>
                            <p><strong>Total Quantity:</strong> {batch.totalQuantity} units</p>
                        </div>

                        <div className="work-timer-section">
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
                            <label>Quantity In</label>
                            <input
                                type="number"
                                placeholder="Units received"
                                value={formData.quantityIn}
                                onChange={(e) => setFormData({ ...formData, quantityIn: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Quantity Out</label>
                            <input
                                type="number"
                                placeholder="Units completed"
                                value={formData.quantityOut}
                                onChange={(e) => setFormData({ ...formData, quantityOut: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Notes (Optional)</label>
                            <textarea
                                placeholder="Any observations or issues..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !startTime}
                        >
                            {loading ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkLogModal;
