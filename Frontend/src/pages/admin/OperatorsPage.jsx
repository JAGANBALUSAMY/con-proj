import React, { useState, useEffect } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import OperatorView from '@frontend/pages/admin/OperatorView';
import CreateOperatorModal from '@frontend/pages/admin/CreateOperatorModal';
import UserActionModal from '@frontend/components/dashboard/UserActionModal';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import api from '@frontend/services/api';
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
                <PageHeader
                    title="Operational Fleet"
                    subtitle="Direct Labor Personnel Registry"
                    actions={
                        <Button variant="primary" size="sm" leftIcon={UserPlus} onClick={() => setIsCreateModalOpen(true)}>
                            Commission Operator
                        </Button>
                    }
                />

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
