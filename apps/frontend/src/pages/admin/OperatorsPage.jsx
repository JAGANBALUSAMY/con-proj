import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import OperatorView from './OperatorView';
import CreateOperatorModal from './CreateOperatorModal';
import UserActionModal from '../../components/dashboard/UserActionModal';
import api from '../../utils/api';
import { Users, UserPlus } from 'lucide-react';

const OperatorsPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Failed to fetch operators:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleManageUser = (user) => {
        setSelectedUser(user);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Users className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Operational Fleet</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Direct Labor Personnel Registry</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <UserPlus size={16} />
                        Commission Operator
                    </button>
                </div>

                <OperatorView
                    users={users}
                    onRefresh={fetchUsers}
                    onManage={handleManageUser}
                    loading={loading}
                />
            </div>

            <CreateOperatorModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchUsers}
            />

            {selectedUser && (
                <UserActionModal
                    user={selectedUser}
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdate={fetchUsers}
                />
            )}
        </DashboardLayout>
    );
};

export default OperatorsPage;
