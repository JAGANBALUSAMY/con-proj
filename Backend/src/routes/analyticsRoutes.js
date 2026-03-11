const express = require('express');
const { getProductionEfficiency, getOperatorPerformance, getDefectStats, getOperatorRankings, getDailySummary } = require('#backend/controllers/analyticsController');
const { protect, restrictTo, validateServiceToken } = require('#backend/middleware/authMiddleware');

const router = express.Router();

// n8n specific endpoint
router.get('/summary', validateServiceToken, getDailySummary);

// All analytics routes require at least MANAGER role
router.get('/efficiency', protect, restrictTo('ADMIN', 'MANAGER'), getProductionEfficiency);
router.get('/performance', protect, restrictTo('ADMIN', 'MANAGER'), getOperatorPerformance);
router.get('/defects', protect, restrictTo('ADMIN', 'MANAGER'), getDefectStats);
router.get('/operator-rankings', protect, restrictTo('ADMIN', 'MANAGER'), getOperatorRankings);

module.exports = router;
