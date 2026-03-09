import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import OperatorRegistry from '../../components/dashboard/OperatorRegistry';
import UserActionModal from '../../components/dashboard/UserActionModal';
import api from '../../utils/api';
import { Users, ShieldCheck } from 'lucide-react';

const OperatorsPage = () => {
    const [operators, setOperators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchMyOperators = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/my-operators');
            setOperators(response.data.operators || []);
        } catch (error) {
            console.error('Failed to fetch operators:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyOperators();
    }, []);

    const handleManageUser = (user) => {
        setSelectedUser(user);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Users className="text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Assigned Operator Force</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Section Specialist Registry</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-success/5 rounded-lg border border-success/10">
                        <ShieldCheck size={16} className="text-success" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-success">Verified Command</span>
                    </div>
                </div>

                <OperatorRegistry
                    operators={operators}
                    loading={loading}
                    onRefresh={fetchMyOperators}
                    onManage={handleManageUser}
                    title="Section Workforce"
                    subtitle="Performance tracking and station monitoring for assigned personnel"
                />
            </div>

            {selectedUser && (
                <UserActionModal
                    user={selectedUser}
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdate={fetchMyOperators}
                />
            )}
        </DashboardLayout>
    );
};

export default OperatorsPage;
