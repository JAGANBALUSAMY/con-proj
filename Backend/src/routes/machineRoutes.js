const express = require('express');
const { getMachineStatus } = require('#backend/controllers/machineController');
const { protect, restrictTo } = require('#backend/middleware/authMiddleware');

const router = express.Router();

// Machine status is restricted to ADMIN and MANAGER
router.get('/status', protect, restrictTo('ADMIN', 'MANAGER'), getMachineStatus);

module.exports = router;
