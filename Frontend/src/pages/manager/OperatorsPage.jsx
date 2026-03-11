import React, { useState, useEffect } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import OperatorRegistry from '@frontend/components/dashboard/OperatorRegistry';
import UserActionModal from '@frontend/components/dashboard/UserActionModal';
import PageHeader from '@frontend/components/ui/PageHeader';
import api from '@frontend/services/api';
import { ShieldCheck } from 'lucide-react';

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
                <PageHeader
                    title="Assigned Operator Force"
                    subtitle="Section Specialist Registry — Performance tracking and station monitoring"
                    actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.15)' }}>
                            <ShieldCheck size={14} style={{ color: 'var(--bs-success)' }} />
                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bs-success)' }}>Verified Command</span>
                        </div>
                    }
                />

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
