import React, { useState } from 'react';
import { Loader2, Zap, AlertCircle } from 'lucide-react';
import api from '@frontend/services/api';
import Modal from '@frontend/components/UI/Modal';

const CreateOperatorModal = ({ isOpen, onClose, onSuccess }) => {
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
        setLoading(true);
        setError('');
        try {
            await api.post('/users/operator', formData);
            onSuccess();
            onClose();
            setFormData({ employeeCode: '', fullName: '', password: '', sections: [] });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to instantiate operator account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Deploy Operational Workforce"
            maxWidth="max-w-md"
            footer={
                <>
                    <button type="button" className="btn-secondary px-6 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={onClose} disabled={loading}>
                        Abort
                    </button>
                    <button
                        type="submit"
                        form="create-operator-form"
                        className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Commission Account'}
                    </button>
                </>
            }
        >
            <form id="create-operator-form" onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-error/5 border border-error/20 rounded-2xl text-error text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        Registry Identifier (Emp Code)
                    </label>
                    <input
                        type="text"
                        className="w-full bg-background border border-border px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all"
                        placeholder="e.g. OP-882"
                        value={formData.employeeCode}
                        onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        Deployment Identity (Full Name)
                    </label>
                    <input
                        type="text"
                        className="w-full bg-background border border-border px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all"
                        placeholder="OPERATOR NAME..."
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                        Initial Access Token (Password)
                    </label>
                    <input
                        type="password"
                        className="w-full bg-background border border-border px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                        <Zap size={14} className="text-emerald-500" />
                        Station Assignments (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-background border border-border rounded-2xl">
                        {availableSections.map(section => (
                            <button
                                key={section}
                                type="button"
                                onClick={() => handleSectionToggle(section)}
                                className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border transition-all ${formData.sections.includes(section)
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-card border-border text-slate-500 hover:border-emerald-500/30 hover:text-emerald-600'
                                    }`}
                            >
                                {section.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic ml-1">Operators without assignments default to Float status</p>
                </div>
            </form>
        </Modal>
    );
};

export default CreateOperatorModal;
