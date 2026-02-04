const { createManager, createOperator } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Only ADMIN can create Managers
router.post('/manager', protect, restrictTo('ADMIN'), createManager);

// Only MANAGER can create Operators
router.post('/operator', protect, restrictTo('MANAGER'), createOperator);

module.exports = router;
