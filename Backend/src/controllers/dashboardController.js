const dashboardService = require('#backend/services/dashboardService');

/**
 * ADMIN: Global factory overview
 */
const getAdminStats = async (req, res) => {
    try {
        const stats = await dashboardService.getAdminStats(req.query);
        return res.status(200).json(stats);
    } catch (error) {
        console.error('Admin Stats Error:', error);
        return res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

/**
 * MANAGER: Sections, Approval Queue, and Team
 */
const getManagerDashboard = async (req, res) => {
    try {
        const data = await dashboardService.getManagerDashboard(req.user);
        return res.status(200).json(data);
    } catch (error) {
        console.error('Manager Dashboard Error:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch manager dashboard data',
            details: error.message
        });
    }
};

/**
 * OPERATOR: Assigned station work
 */
const getOperatorDashboard = async (req, res) => {
    try {
        const data = await dashboardService.getOperatorDashboard(req.user);
        return res.status(200).json(data);
    } catch (error) {
        console.error('Operator Dashboard Error:', error);
        return res.status(500).json({ error: 'Failed to fetch operator dashboard data' });
    }
};

/**
 * CREATE BATCH (ADMIN or MANAGER)
 */
const createBatch = async (req, res) => {
    try {
        const batch = await dashboardService.createBatch(req.body, req.user);
        return res.status(201).json({
            message: 'Batch created successfully',
            batch
        });
    } catch (error) {
        console.error('Create batch error:', error.message);
        const status = error.message.includes('Access denied') ? 403 : 400;
        return res.status(status).json({ error: error.message });
    }
};

/**
 * CANCEL BATCH (ADMIN or MANAGER)
 */
const cancelBatch = async (req, res) => {
    try {
        const batch = await dashboardService.cancelBatch(req.params.batchId);
        return res.status(200).json({
            message: 'Batch cancelled successfully',
            batch
        });
    } catch (error) {
        console.error('Cancel batch error:', error.message);
        const status = error.message.includes('not found') ? 404 : 400;
        return res.status(status).json({ error: error.message });
    }
};

module.exports = {
    getAdminStats,
    getManagerDashboard,
    getOperatorDashboard,
    createBatch,
    cancelBatch
};
