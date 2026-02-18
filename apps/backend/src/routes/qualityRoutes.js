const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { recordDefect, getQualitySummary } = require('../controllers/qualityController');

const router = express.Router();

// All routes require authentication
// POST: Operator records quality check defects
router.post('/record-defect', protect, restrictTo('OPERATOR'), recordDefect);

// GET: Operator views quality summary for a batch
router.get('/batch/:batchId/summary', protect, restrictTo('OPERATOR'), getQualitySummary);

module.exports = router;
