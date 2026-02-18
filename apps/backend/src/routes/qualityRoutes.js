const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { recordDefect, getBatchQualitySummary } = require('../controllers/qualityController');

// All routes require authentication
router.use(protect);

// Operators record defects
router.post('/record-defect', restrictTo('OPERATOR'), recordDefect);

// Get summary (for UI limits) - Accessible by Operators and Managers
router.get('/batch/:batchId/summary', getBatchQualitySummary);

module.exports = router;
