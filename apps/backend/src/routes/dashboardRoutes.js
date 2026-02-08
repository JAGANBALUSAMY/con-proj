const express = require('express');
const { getAdminStats, getManagerDashboard, getOperatorDashboard } = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', protect, restrictTo('ADMIN'), getAdminStats);
router.get('/manager', protect, restrictTo('MANAGER'), getManagerDashboard);
router.get('/operator', protect, restrictTo('OPERATOR'), getOperatorDashboard);

module.exports = router;
