const express = require('express');
const { login } = require('#backend/controllers/authController');

const router = express.Router();

// Public login route
router.post('/login', login);

module.exports = router;
