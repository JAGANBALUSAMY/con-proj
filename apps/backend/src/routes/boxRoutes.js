const express = require('express');
const router = express.Router();
const boxController = require('../controllers/boxController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// List all boxes - Admin & Manager
router.get('/', protect, restrictTo('ADMIN', 'MANAGER'), boxController.getBoxes);

// Update Box Status - Manager Only (as per plan/constraints)
// Admin could theoretically do it too, but sticking to "Manager-Only" for now as requested.
router.patch('/:id/status', protect, restrictTo('MANAGER', 'ADMIN'), boxController.updateBoxStatus);

module.exports = router;
