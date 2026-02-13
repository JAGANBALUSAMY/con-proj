import React, { useState, useEffect } from 'react';
import { X, Clock, Package, Wrench } from 'lucide-react';
import api from '../../utils/api';
import '../../styles/modal.css';

const WorkLogModal = ({ isOpen, onClose, batch, onSuccess }) => {
    const [formData, setFormData] = useState({
        startTime: '',
        endTime: '',
        quantityIn: '',
        quantityOut: '',
        machineId: '',
        notes: ''
    });
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && batch) {
            // Pre-fill with current time
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            setFormData({
                startTime: oneHourAgo.toISOString().slice(0, 16),
                endTime: now.toISOString().slice(0, 16),
                quantityIn: batch.usableQuantity || batch.totalQuantity || '',
                quantityOut: '',
                machineId: '',
                notes: ''
            });

            // Fetch machines (optional - can be empty for now)
            // fetchMachines();
        }
    }, [isOpen, batch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate end time >= start time
        if (new Date(formData.endTime) < new Date(formData.startTime)) {
            setError('End time must be greater than or equal to start time');
            setLoading(false);
            return;
        }

        try {
            await api.post('/production/log', {
                batchId: batch.id,
                startTime: formData.startTime,
                endTime: formData.endTime,
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
                    {error && <div className="error-banner">{error}</div>}

                    <div className="info-box">
                        <p><strong>Batch:</strong> {batch.batchNumber} - {batch.briefTypeName}</p>
                        <p><strong>Stage:</strong> {batch.currentStage}</p>
                        <p><strong>Total Quantity:</strong> {batch.totalQuantity} units</p>
                    </div>

                    <div className="form-group">
                        <label><Clock size={16} /> Start Time</label>
                        <input
                            type="datetime-local"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><Clock size={16} /> End Time</label>
                        <input
                            type="datetime-local"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            required
                        />
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

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkLogModal;
