const express = require('express');
const {
    createManager,
    createOperator,
    verifyOperator,
    getUsers,
    updateManagerSections,
    resetManagerPassword,
    toggleManagerStatus,
    forceLogout,
    getMyOperators,
    updateOperatorStatus,
    resetOperatorPassword,
    forceOperatorLogout,
    getManagers
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Only ADMIN can create Managers or view all users
router.post('/manager', protect, restrictTo('ADMIN'), createManager);
router.get('/', protect, restrictTo('ADMIN'), getUsers);
router.get('/managers', protect, restrictTo('MANAGER'), getManagers);

// Only MANAGER can create Operators
router.post('/operator', protect, restrictTo('MANAGER'), createOperator);

// Only MANAGER can verify their own Operators
router.patch('/:id/verify', protect, restrictTo('MANAGER'), verifyOperator);

// ADMIN-only governance actions on MANAGERS
router.patch('/:id/sections', protect, restrictTo('ADMIN'), updateManagerSections);
router.patch('/:id/reset-password', protect, restrictTo('ADMIN'), resetManagerPassword);
router.patch('/:id/status', protect, restrictTo('ADMIN'), toggleManagerStatus);
router.post('/:id/force-logout', protect, restrictTo('ADMIN'), forceLogout);

// MANAGER-only governance actions on OWNED OPERATORS
router.get('/my-operators', protect, restrictTo('MANAGER'), getMyOperators);
router.patch('/:id/operator-status', protect, restrictTo('MANAGER'), updateOperatorStatus);
router.patch('/:id/reset-operator-password', protect, restrictTo('MANAGER'), resetOperatorPassword);
router.post('/:id/force-operator-logout', protect, restrictTo('MANAGER'), forceOperatorLogout);

module.exports = router;
