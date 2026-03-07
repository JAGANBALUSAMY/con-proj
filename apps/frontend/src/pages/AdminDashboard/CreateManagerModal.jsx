import React, { useState } from 'react';
import { Loader2, Activity } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../../components/UI/Modal';

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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Provision Manager Account"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-manager-form"
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
                    </button>
                </>
            }
        >
            <form id="create-manager-form" onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-xs font-bold flex items-center gap-2">
                        <Activity size={14} />
                        {error}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">
                        Employee Code
                    </label>
                    <input
                        type="text"
                        className="input-saas"
                        placeholder="e.g. MGR005"
                        value={formData.employeeCode}
                        onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">
                        Full Name
                    </label>
                    <input
                        type="text"
                        className="input-saas"
                        placeholder="e.g. Robert Smith"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">
                        Initial Password
                    </label>
                    <input
                        type="password"
                        className="input-saas"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">
                        Assigned Sections (Supervisor Scope)
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-background border border-border rounded-xl">
                        {availableSections.map(section => (
                            <button
                                key={section}
                                type="button"
                                onClick={() => handleSectionToggle(section)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tighter transition-all duration-200 border ${formData.sections.includes(section)
                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-card border-border text-text-secondary hover:border-primary/30 hover:text-primary'
                                    }`}
                            >
                                {section}
                            </button>
                        ))}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default CreateManagerModal;
