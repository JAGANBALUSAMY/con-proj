const express = require('express');
const { protect, restrictTo } = require('#backend/middleware/authMiddleware');
const { createReworkLog } = require('#backend/controllers/reworkController');

const router = express.Router();

// POST: Operator creates rework log
router.post('/create', protect, restrictTo('OPERATOR'), createReworkLog);

module.exports = router;
