const express = require('express');
const { getProductionEfficiency, getOperatorPerformance, getDefectStats } = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// All analytics routes require at least MANAGER role
router.get('/efficiency', protect, restrictTo('ADMIN', 'MANAGER'), getProductionEfficiency);
router.get('/performance', protect, restrictTo('ADMIN', 'MANAGER'), getOperatorPerformance);
router.get('/defects', protect, restrictTo('ADMIN', 'MANAGER'), getDefectStats);

module.exports = router;
