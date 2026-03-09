const express = require('express');
const { generateAIReport } = require('#backend/controllers/aiReportController');
const { protect, restrictTo } = require('#backend/middleware/authMiddleware');

const router = express.Router();

// AI report generation restricted to ADMIN and MANAGER
router.post('/report', protect, restrictTo('ADMIN', 'MANAGER'), generateAIReport);

module.exports = router;
