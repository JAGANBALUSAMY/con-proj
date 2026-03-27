import React, { useState, useEffect } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import ManagerView from '@frontend/pages/admin/ManagerView';
import CreateManagerModal from '@frontend/pages/admin/CreateManagerModal';
import UserActionModal from '@frontend/components/dashboard/UserActionModal';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import api from '@frontend/services/api';
import { ShieldCheck, UserPlus } from 'lucide-react';

const ManagersPage = () => {
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
            console.error('Failed to fetch managers:', error);
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
                    title="Management Registry"
                    subtitle="Authorized Factory Governance"
                    actions={
                        <Button variant="primary" size="sm" leftIcon={UserPlus} onClick={() => setIsCreateModalOpen(true)}>
                            Provision Manager
                        </Button>
                    }
                />

                <ManagerView
                    users={users}
                    onRefresh={fetchUsers}
                    onManage={handleManageUser}
                    loading={loading}
                />
            </div>

            <CreateManagerModal
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

export default ManagersPage;
