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
} = require('#backend/controllers/userController');
const { protect, restrictTo } = require('#backend/middleware/authMiddleware');

const router = express.Router();

// Only ADMIN can create Managers or view all users
router.post('/manager', protect, restrictTo('ADMIN'), createManager);
router.get('/', protect, restrictTo('ADMIN'), getUsers);
router.get('/managers', protect, restrictTo('MANAGER'), getManagers);
router.get('/my-operators', protect, restrictTo('MANAGER'), getMyOperators);

// Only MANAGER can create Operators
router.post('/operator', protect, restrictTo('MANAGER'), createOperator);

// Only MANAGER can verify their own Operators
router.patch('/:id/verify', protect, restrictTo('MANAGER'), verifyOperator);

// ADMIN-only governance actions on MANAGERS
router.patch('/:id/sections', protect, restrictTo('ADMIN'), updateManagerSections);
router.patch('/:id/reset-password', protect, restrictTo('ADMIN'), resetManagerPassword);
router.patch('/:id/status', protect, restrictTo('ADMIN'), toggleManagerStatus);
router.post('/:id/force-logout', protect, restrictTo('ADMIN'), forceLogout);

// ADMIN or MANAGER governance actions on OPERATORS
router.patch('/:id/operator-status', protect, restrictTo('ADMIN', 'MANAGER'), updateOperatorStatus);
router.patch('/:id/reset-operator-password', protect, restrictTo('ADMIN', 'MANAGER'), resetOperatorPassword);
router.post('/:id/force-operator-logout', protect, restrictTo('ADMIN', 'MANAGER'), forceOperatorLogout);

// NEW: Update sections for any user (Managers or Operators) - Only for ADMIN
router.patch('/:id/update-sections', protect, restrictTo('ADMIN'), updateManagerSections);

module.exports = router;
