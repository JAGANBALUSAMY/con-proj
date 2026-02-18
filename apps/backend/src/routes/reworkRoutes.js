const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { createReworkLog } = require('../controllers/reworkController');

const router = express.Router();

// POST: Operator creates rework log
router.post('/create', protect, restrictTo('OPERATOR'), createReworkLog);

module.exports = router;
