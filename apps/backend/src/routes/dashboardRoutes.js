const express = require('express');
const { getAdminStats, getManagerDashboard, getOperatorDashboard, createBatch, cancelBatch } = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', protect, restrictTo('ADMIN'), getAdminStats);
router.get('/manager', protect, restrictTo('MANAGER'), getManagerDashboard);
router.get('/operator', protect, restrictTo('OPERATOR'), getOperatorDashboard);

// Batch creation & cancellation (ADMIN or MANAGER)
router.post('/batches', protect, restrictTo('ADMIN', 'MANAGER'), createBatch);
router.delete('/batches/:batchId', protect, restrictTo('ADMIN', 'MANAGER'), cancelBatch);

module.exports = router;
