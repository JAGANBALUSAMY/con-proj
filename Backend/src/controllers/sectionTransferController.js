const sectionTransferService = require('#backend/services/sectionTransferService');

/**
 * Request Section Transfer
 */
const requestSectionTransfer = async (req, res) => {
    try {
        const transfer = await sectionTransferService.requestSectionTransfer(req.body, req.user.userId);
        return res.status(201).json(transfer);
    } catch (error) {
        console.error('Request Transfer Error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Accept or Reject Transfer
 */
const reviewSectionTransfer = async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        const result = await sectionTransferService.reviewSectionTransfer(req.params.id, req.user.userId, action, rejectionReason);
        return res.json(result);
    } catch (error) {
        console.error('Review Transfer Error:', error.message);
        const status = error.message.includes('pending') ? 409 : 500;
        return res.status(status).json({ error: error.message });
    }
};

/**
 * Cancel Transfer Request
 */
const cancelSectionTransfer = async (req, res) => {
    try {
        const result = await sectionTransferService.cancelSectionTransfer(req.params.id, req.user.userId);
        return res.json(result);
    } catch (error) {
        console.error('Cancel Transfer Error:', error.message);
        return res.status(400).json({ error: error.message });
    }
};

/**
 * Get pending transfers for target manager
 */
const getPendingTransfers = async (req, res) => {
    try {
        const transfers = await sectionTransferService.getPendingTransfers(req.user.userId);
        return res.json(transfers);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch pending transfers' });
    }
};

/**
 * Get transfer requests initiated by manager
 */
const getMyTransferRequests = async (req, res) => {
    try {
        const transfers = await sectionTransferService.getMyTransferRequests(req.user.userId);
        return res.json(transfers);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
};

/**
 * Get all resolved transfers
 */
const getTransferHistory = async (req, res) => {
    try {
        const transfers = await sectionTransferService.getTransferHistory(req.user.userId);
        return res.json(transfers);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch transfer history' });
    }
};

module.exports = {
    requestSectionTransfer,
    reviewSectionTransfer,
    cancelSectionTransfer,
    getPendingTransfers,
    getMyTransferRequests,
    getTransferHistory
};
