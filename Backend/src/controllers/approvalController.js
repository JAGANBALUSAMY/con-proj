const approvalService = require('#backend/services/approvalService');

/**
 * Approve a Production Log
 */
const approveProductionLog = async (req, res) => {
    try {
        const result = await approvalService.approveProductionLog(req.params.logId, req.user.userId, req.user.sections);
        return res.status(200).json({ message: 'Log approved and batch advanced', log: result });
    } catch (error) {
        console.error('Approve Log Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Approve Rework
 */
const approveRework = async (req, res) => {
    try {
        const result = await approvalService.approveRework(req.params.reworkId, req.user.userId, req.user.sections);
        return res.status(200).json({ message: 'Rework approved', rework: result.rework, batchStats: result.batch });
    } catch (error) {
        console.error('Approve Rework Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Reject Rework
 */
const rejectRework = async (req, res) => {
    try {
        const updated = await approvalService.rejectRework(req.params.reworkId, req.user.userId, req.user.sections, req.body.reason);
        return res.status(200).json({ message: 'Rework rejected', rework: updated });
    } catch (error) {
        console.error('Reject Rework Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Reject a Production Log
 */
const rejectProductionLog = async (req, res) => {
    try {
        const updated = await approvalService.rejectProductionLog(req.params.logId, req.user.userId, req.body.reason);
        return res.status(200).json({ message: 'Log rejected', log: updated });
    } catch (error) {
        console.error('Reject Log Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Approve Batch Start
 */
const startBatch = async (req, res) => {
    try {
        const updated = await approvalService.startBatch(req.params.batchId, req.user.sections);
        return res.status(200).json({ message: 'Batch Started', batch: updated });
    } catch (error) {
        console.error('Start Batch Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    approveProductionLog,
    rejectProductionLog,
    approveRework,
    rejectRework,
    startBatch
};
