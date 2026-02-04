const express = require('express');
const { createManager } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Only ADMIN can create Managers
router.post('/manager', protect, restrictTo('ADMIN'), createManager);

module.exports = router;
