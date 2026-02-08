const express = require('express');
const { createManager, createOperator, verifyOperator, getUsers } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Only ADMIN can create Managers or view all users
router.post('/manager', protect, restrictTo('ADMIN'), createManager);
router.get('/', protect, restrictTo('ADMIN'), getUsers);

// Only MANAGER can create Operators
router.post('/operator', protect, restrictTo('MANAGER'), createOperator);

// Only MANAGER can verify their own Operators
router.patch('/:id/verify', protect, restrictTo('MANAGER'), verifyOperator);

module.exports = router;
