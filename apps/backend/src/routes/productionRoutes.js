const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { createProductionLog } = require('../controllers/productionController');

// Operator creates production log
router.post('/log', protect, restrictTo('OPERATOR'), createProductionLog);

module.exports = router;
