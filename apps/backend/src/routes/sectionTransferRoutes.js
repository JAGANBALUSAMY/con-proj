const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    requestSectionTransfer,
    reviewSectionTransfer,
    cancelSectionTransfer,
    getPendingTransfers,
    getMyTransferRequests,
    getTransferHistory
} = require('../controllers/sectionTransferController');

const router = express.Router();

// All routes require MANAGER role
router.use(protect, restrictTo('MANAGER'));

// Request section transfer
router.post('/', requestSectionTransfer);

// Review transfer (accept/reject)
router.patch('/:id/review', reviewSectionTransfer);

// Cancel transfer request
router.patch('/:id/cancel', cancelSectionTransfer);

// Get pending transfers (for target manager)
router.get('/pending', getPendingTransfers);

// Get my transfer requests (for requesting manager)
router.get('/my-requests', getMyTransferRequests);

// Get transfer history (resolved requests)
router.get('/history', getTransferHistory);

module.exports = router;
