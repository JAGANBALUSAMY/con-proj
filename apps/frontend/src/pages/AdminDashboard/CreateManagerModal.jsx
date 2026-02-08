import React, { useState } from 'react';
import { X, ShieldPlus, Loader2 } from 'lucide-react';
import api from '../../utils/api';

const CreateManagerModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        employeeCode: '',
        fullName: '',
        password: '',
        sections: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const availableSections = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];

    const handleSectionToggle = (section) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.includes(section)
                ? prev.sections.filter(s => s !== section)
                : [...prev.sections, section]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.sections.length === 0) {
            setError('At least one section must be assigned');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/users/manager', formData);
            onSuccess();
            onClose();
            setFormData({ employeeCode: '', fullName: '', password: '', sections: [] });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create manager');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-header">
                    <div className="title-area">
                        <ShieldPlus size={20} className="icon-blue" />
                        <h3>Provision Manager Account</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-alert">{error}</div>}

                    <div className="form-group">
                        <label>Employee Code</label>
                        <input
                            type="text"
                            placeholder="e.g. MGR005"
                            value={formData.employeeCode}
                            onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Robert Smith"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Initial Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Assigned Sections (Supervisor Scope)</label>
                        <div className="section-selector">
                            {availableSections.map(section => (
                                <button
                                    key={section}
                                    type="button"
                                    className={`section-chip ${formData.sections.includes(section) ? 'active' : ''}`}
                                    onClick={() => handleSectionToggle(section)}
                                >
                                    {section}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={18} className="spin" /> : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateManagerModal;
