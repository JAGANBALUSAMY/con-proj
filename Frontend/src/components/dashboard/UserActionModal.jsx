import React, { useState } from 'react';
import { Shield, Key, Power, LogOut, Edit, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@frontend/services/api';
import Modal from '@frontend/components/ui/Modal';

const UserActionModal = ({ user, isOpen, onClose, onUpdate }) => {
    const [actionLoading, setActionLoading] = useState(null); // 'password', 'status', 'logout', 'sections'
    const [newPassword, setNewPassword] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isEditingSections, setIsEditingSections] = useState(false);
    const [editedSections, setEditedSections] = useState(user?.sections || []);

    const availableSections = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];

    if (!user) return null;

    const isOperator = user.role === 'OPERATOR';

    const handleResetPassword = async () => {
        if (!newPassword) return;
        setActionLoading('password');
        try {
            const endpoint = isOperator
                ? `/users/${user.id}/reset-operator-password`
                : `/users/${user.id}/reset-password`;
            await api.patch(endpoint, { newPassword });
            setIsResettingPassword(false);
            setNewPassword('');
            alert('Password reset successful');
        } catch (error) {
            alert(error.response?.data?.error || 'Password reset failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        setActionLoading('status');
        try {
            const endpoint = isOperator
                ? `/users/${user.id}/operator-status`
                : `/users/${user.id}/status`;
            await api.patch(endpoint, { status: newStatus });
            onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Status toggle failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleForceLogout = async () => {
        setActionLoading('logout');
        try {
            const endpoint = isOperator
                ? `/users/${user.id}/force-operator-logout`
                : `/users/${user.id}/force-logout`;
            await api.post(endpoint);
            alert('Force logout successful');
        } catch (error) {
            alert(error.response?.data?.error || 'Force logout failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateSections = async () => {
        setActionLoading('sections');
        try {
            // Both Managers and Operators now use /users/:id/sections on backend for ADMIN
            const endpoint = `/users/${user.id}/sections`;
            await api.patch(endpoint, { sections: editedSections });
            setIsEditingSections(false);
            onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Sections update failed');
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSection = (section) => {
        setEditedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="User Governance Protocol"
            maxWidth="max-w-md"
        >
            <div className="space-y-6">
                {/* User Identity Brief */}
                <div className="p-4 bg-background border border-border rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 text-xl">
                        {user.fullName.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{user.fullName}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{user.employeeCode}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${user.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                {user.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section Management */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Shield size={14} className="text-primary" />
                            Jurisdiction Assignment
                        </label>
                        <button
                            onClick={() => setIsEditingSections(!isEditingSections)}
                            className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                            {isEditingSections ? 'Cancel' : 'Modify'}
                        </button>
                    </div>

                    {isEditingSections ? (
                        <div className="grid grid-cols-2 gap-2">
                            {availableSections.map(s => (
                                <button
                                    key={s}
                                    onClick={() => toggleSection(s)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border transition-all ${editedSections.includes(s)
                                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                        : 'bg-card border-border text-slate-500 hover:border-primary/30'
                                        }`}
                                >
                                    {s.replace('_', ' ')}
                                </button>
                            ))}
                            <button
                                onClick={handleUpdateSections}
                                disabled={actionLoading === 'sections'}
                                className="col-span-2 mt-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                {actionLoading === 'sections' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Apply Jurisdiction Change
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5 px-1">
                            {(user.sections || []).length > 0 ? (
                                user.sections.map(s => (
                                    <span key={s} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border border-border">
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">No Jurisdictions Assigned</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Password Reset Section */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Key size={14} className="text-primary" />
                        Credentials Reset
                    </label>

                    {isResettingPassword ? (
                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder="NEW ACCESS TOKEN..."
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="flex-1 bg-background border border-border px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:border-primary/50 transition-all"
                            />
                            <button
                                onClick={handleResetPassword}
                                disabled={actionLoading === 'password' || !newPassword}
                                className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {actionLoading === 'password' ? <Loader2 size={14} className="animate-spin" /> : 'RESET'}
                            </button>
                            <button onClick={() => { setIsResettingPassword(false); setNewPassword(''); }} className="text-[10px] font-black text-slate-400">ESC</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsResettingPassword(true)}
                            className="w-full bg-background border border-border py-2.5 rounded-xl text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                        >
                            Trigger Secure Password Reset
                        </button>
                    )}
                </div>

                {/* Danger Zone Actions */}
                <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
                    <button
                        onClick={handleToggleStatus}
                        disabled={actionLoading === 'status'}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${user.status === 'ACTIVE'
                            ? 'border-error/20 text-error hover:bg-error/5'
                            : 'border-success/20 text-success hover:bg-success/5'
                            }`}
                    >
                        {actionLoading === 'status' ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                        {user.status === 'ACTIVE' ? 'Kill Access' : 'Restore Access'}
                    </button>
                    <button
                        onClick={handleForceLogout}
                        disabled={actionLoading === 'logout'}
                        className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        {actionLoading === 'logout' ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                        Force Logout
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default UserActionModal;
