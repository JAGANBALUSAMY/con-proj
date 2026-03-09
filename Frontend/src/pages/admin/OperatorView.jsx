import React from 'react';
import OperatorRegistry from '@frontend/components/dashboard/OperatorRegistry';

const OperatorView = ({ users, loading, onRefresh, onManage }) => {
    const operators = users.filter(u => u.role === 'OPERATOR');

    return (
        <OperatorRegistry
            operators={operators}
            loading={loading}
            onRefresh={onRefresh}
            onManage={onManage}
            title="Operational Fleet"
            subtitle="Direct labor tracking and station assignment monitoring"
        />
    );
};

export default OperatorView;
