const express = require('express');
const { upsertDailyReport, getLatestReport, getReportByDate, getRecentReports } = require('#backend/controllers/reportController');
const { validateServiceToken, protect } = require('#backend/middleware/authMiddleware');

const router = express.Router();

/**
 * n8n facing endpoint (Protected by SERVICE_TOKEN)
 */
router.post('/daily', validateServiceToken, upsertDailyReport);

/**
 * Dashboard facing endpoints (Protected by user auth)
 */
router.get('/daily/latest', protect, getLatestReport);
router.get('/daily/recent', protect, getRecentReports);
router.get('/daily/:date', protect, getReportByDate);

module.exports = router;
