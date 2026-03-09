const express = require('express');
const { getProductionEfficiency, getOperatorPerformance, getDefectStats, getOperatorRankings } = require('#backend/controllers/analyticsController');
const { protect, restrictTo } = require('#backend/middleware/authMiddleware');

const router = express.Router();

// All analytics routes require at least MANAGER role
router.get('/efficiency', protect, restrictTo('ADMIN', 'MANAGER'), getProductionEfficiency);
router.get('/performance', protect, restrictTo('ADMIN', 'MANAGER'), getOperatorPerformance);
router.get('/defects', protect, restrictTo('ADMIN', 'MANAGER'), getDefectStats);
router.get('/operator-rankings', protect, restrictTo('ADMIN', 'MANAGER'), getOperatorRankings);

module.exports = router;
