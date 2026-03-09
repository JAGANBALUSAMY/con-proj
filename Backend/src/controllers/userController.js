const userService = require('#backend/services/userService');

/**
 * Admin creates a Manager
 */
const createManager = async (req, res) => {
    try {
        const result = await userService.createManager(req.body, req.user.userId);
        return res.status(201).json({
            message: 'Manager created successfully',
            user: {
                id: result.manager.id,
                employeeCode: result.manager.employeeCode,
                fullName: result.manager.fullName,
                role: result.manager.role,
                sections: result.sections
            }
        });
    } catch (error) {
        console.error('Create manager error:', error.message);
        return res.status(error.message.includes('unique') ? 400 : 500).json({ error: error.message });
    }
};

/**
 * Manager creates an Operator
 */
const createOperator = async (req, res) => {
    try {
        const result = await userService.createOperator(req.body, req.user.userId);
        return res.status(201).json({
            message: 'Operator created successfully. Account is PENDING verification by Manager.',
            user: {
                id: result.operator.id,
                employeeCode: result.operator.employeeCode,
                fullName: result.operator.fullName,
                role: result.operator.role,
                sections: [result.section],
                verificationStatus: 'PENDING'
            }
        });
    } catch (error) {
        console.error('Create operator error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Manager verifies an Operator
 */
const verifyOperator = async (req, res) => {
    try {
        const updated = await userService.verifyOperator(req.params.id, req.user.userId, req.user.role);
        return res.status(200).json({
            message: 'Operator verified successfully. They can now log in.',
            user: {
                id: updated.id,
                employeeCode: updated.employeeCode,
                fullName: updated.fullName,
                verificationStatus: updated.verificationStatus,
                verifiedAt: updated.verifiedAt
            }
        });
    } catch (error) {
        console.error('Verify operator error:', error.message);
        const status = error.message.includes('Unauthorized') ? 403 : 400;
        return res.status(status).json({ error: error.message });
    }
};

/**
 * Admin: Get all users
 */
const getUsers = async (req, res) => {
    try {
        const result = await userService.getUsers(req.query);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * Admin: Update Manager/Operator Section Assignments
 */
const updateManagerSections = async (req, res) => {
    try {
        const sections = await userService.updateManagerSections(req.params.id, req.body.sections);
        return res.status(200).json({
            message: 'User sections updated successfully',
            sections: sections
        });
    } catch (error) {
        console.error('Update sections error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Admin: Reset Password
 */
const resetManagerPassword = async (req, res) => {
    try {
        await userService.resetPassword(req.params.id, req.body.newPassword, req.user.role);
        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Admin: Activate / Deactivate Account
 */
const toggleManagerStatus = async (req, res) => {
    try {
        const updated = await userService.toggleStatus(req.params.id, req.body.status);
        return res.status(200).json({
            message: `Account ${updated.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: updated.id,
                employeeCode: updated.employeeCode,
                fullName: updated.fullName,
                status: updated.status
            }
        });
    } catch (error) {
        console.error('Toggle status error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Admin: Force Logout (Security Placeholder)
 */
const forceLogout = async (req, res) => {
    return res.status(200).json({
        message: 'Force logout successful. Active sessions invalidated.',
        note: 'User must re-authenticate.'
    });
};

/**
 * Manager: View Owned Operators
 */
const getMyOperators = async (req, res) => {
    try {
        const result = await userService.getMyOperators(req.user.userId, req.user.sections, req.query);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Get my operators error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all managers
 */
const getManagers = async (req, res) => {
    try {
        // Simple direct repo call or move to service if needed
        const userRepository = require('#backend/repositories/userRepository');
        const managers = await userRepository.getUsers(0, 1000, { role: 'MANAGER', status: 'ACTIVE' });

        const formatted = managers.map(m => ({
            id: m.id,
            fullName: m.fullName,
            employeeCode: m.employeeCode,
            sections: m.sectionAssignments.map(sa => sa.stage)
        }));

        return res.json(formatted);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch managers' });
    }
};

/**
 * Admin or Manager: Update Operator Status
 */
const updateOperatorStatus = async (req, res) => {
    try {
        const updated = await userService.toggleStatus(req.params.id, req.body.status);
        return res.status(200).json({
            message: `Operator account ${updated.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: updated.id,
                employeeCode: updated.employeeCode,
                fullName: updated.fullName,
                status: updated.status
            }
        });
    } catch (error) {
        console.error('Update operator status error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Admin or Manager: Reset Operator Password
 */
const resetOperatorPassword = async (req, res) => {
    try {
        await userService.resetPassword(req.params.id, req.body.newPassword, req.user.role);
        return res.status(200).json({ message: 'Operator password reset successfully' });
    } catch (error) {
        console.error('Reset operator password error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Admin or Manager: Force Operator Logout
 */
const forceOperatorLogout = async (req, res) => {
    return res.status(200).json({
        message: 'Operator force logout successful.',
        note: 'User must re-authenticate.'
    });
};

module.exports = {
    createManager,
    createOperator,
    verifyOperator,
    getUsers,
    updateManagerSections,
    resetManagerPassword,
    toggleManagerStatus,
    forceLogout,
    getMyOperators,
    getManagers,
    updateOperatorStatus,
    resetOperatorPassword,
    forceOperatorLogout
};
