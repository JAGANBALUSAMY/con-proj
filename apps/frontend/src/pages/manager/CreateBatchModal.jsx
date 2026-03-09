import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import api from '../../utils/api';
import '../../styles/modal.css';

const CreateBatchModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        batchNumber: '',
        briefTypeName: '',
        totalQuantity: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate quantity
        if (parseInt(formData.totalQuantity) <= 0) {
            setError('Total quantity must be greater than 0');
            setLoading(false);
            return;
        }

        try {
            await api.post('/dashboard/batches', {
                batchNumber: formData.batchNumber.trim(),
                briefTypeName: formData.briefTypeName.trim(),
                totalQuantity: parseInt(formData.totalQuantity)
            });

            alert('Batch created successfully!');
            setFormData({ batchNumber: '', briefTypeName: '', totalQuantity: '' });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create batch');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><Package size={24} /> Create New Batch</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-banner">{error}</div>}

                    <div className="info-box">
                        <p><strong>Note:</strong> Batch will start at CUTTING stage with PENDING status.</p>
                    </div>

                    <div className="form-group">
                        <label>Batch Number *</label>
                        <input
                            type="text"
                            placeholder="e.g., BATCH-001"
                            value={formData.batchNumber}
                            onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Brief Type Name *</label>
                        <input
                            type="text"
                            placeholder="e.g., Classic Brief"
                            value={formData.briefTypeName}
                            onChange={(e) => setFormData({ ...formData, briefTypeName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Total Quantity *</label>
                        <input
                            type="number"
                            placeholder="e.g., 1000"
                            min="1"
                            value={formData.totalQuantity}
                            onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                            required
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateBatchModal;
