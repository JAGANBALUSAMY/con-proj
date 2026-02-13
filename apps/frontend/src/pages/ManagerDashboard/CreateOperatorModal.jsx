import React, { useState } from 'react';
import { X, User, Lock, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import '../../styles/modal.css';

const CreateOperatorModal = ({ isOpen, onClose, onSuccess, managerSections }) => {
    const [formData, setFormData] = useState({
        employeeCode: '',
        fullName: '',
        password: '',
        section: managerSections && managerSections.length === 1 ? managerSections[0] : ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!formData.section) {
            setError('Please select a section for the operator');
            setLoading(false);
            return;
        }

        try {
            await api.post('/users/operator', formData);
            alert('Operator created successfully! They will appear in your team after verification.');
            onSuccess();
            onClose();
            setFormData({ employeeCode: '', fullName: '', password: '', section: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create operator');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><UserPlus size={24} /> Create New Operator</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-banner">{error}</div>}

                    <div className="form-group">
                        <label><User size={16} /> Employee Code</label>
                        <input
                            type="text"
                            placeholder="e.g., OP001"
                            value={formData.employeeCode}
                            onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><User size={16} /> Full Name</label>
                        <input
                            type="text"
                            placeholder="e.g., John Doe"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><Lock size={16} /> Initial Password</label>
                        <input
                            type="password"
                            placeholder="Set a secure password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label><Users size={16} /> Assign Section *</label>
                        <select
                            value={formData.section}
                            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                            required
                        >
                            <option value="">-- Select Section --</option>
                            {managerSections && managerSections.map(section => (
                                <option key={section} value={section}>
                                    {section}
                                </option>
                            ))}
                        </select>
                        <span className="helper-text">Operator will only have access to this section.</span>
                    </div>

                    <div className="info-box">
                        <p><strong>Note:</strong> The operator will be assigned to the selected section and will be in PENDING status until you verify them.</p>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Operator'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateOperatorModal;
