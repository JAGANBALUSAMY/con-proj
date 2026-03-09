const express = require('express');
const { generateAIReport } = require('../controllers/aiReportController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// AI report generation restricted to ADMIN and MANAGER
router.post('/report', protect, restrictTo('ADMIN', 'MANAGER'), generateAIReport);

module.exports = router;
