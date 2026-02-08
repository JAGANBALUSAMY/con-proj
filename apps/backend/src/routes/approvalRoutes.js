const express = require('express');
const { approveProductionLog, rejectProductionLog, approveRework } = require('../controllers/approvalController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Only Managers can approve/reject production work
// Constraint #12 & #4: ADMIN blocked here via restrictTo('MANAGER') middleware
router.patch('/production/:logId/approve', protect, restrictTo('MANAGER'), approveProductionLog);
router.patch('/production/:logId/reject', protect, restrictTo('MANAGER'), rejectProductionLog);
router.patch('/rework/:reworkId/approve', protect, restrictTo('MANAGER'), approveRework);

module.exports = router;
