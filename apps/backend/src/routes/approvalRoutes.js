const express = require('express');
const { approveProductionLog, rejectProductionLog, approveRework, rejectRework } = require('../controllers/approvalController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Only Managers can approve/reject production work
// Constraint #12 & #4: ADMIN blocked here via restrictTo('MANAGER') middleware
router.patch('/production/:logId/approve', protect, restrictTo('MANAGER'), approveProductionLog);
router.patch('/production/:logId/reject', protect, restrictTo('MANAGER'), rejectProductionLog);
router.patch('/rework/:reworkId/approve', protect, restrictTo('MANAGER'), approveRework);
router.patch('/rework/:reworkId/reject', protect, restrictTo('MANAGER'), rejectRework);
router.patch('/batch/:batchId/start', protect, restrictTo('MANAGER'), require('../controllers/approvalController').startBatch);

module.exports = router;
