const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { userRegistrationValidation, userLoginValidation } = require('../middleware/validation');
const { handleValidationErrors } = require('../middleware/error');
const { authenticateToken } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', 
  userRegistrationValidation, 
  handleValidationErrors, 
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', 
  userLoginValidation, 
  handleValidationErrors, 
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', 
  authenticateToken, 
  authController.getMe
);

// @route   PUT /api/auth/me
// @desc    Update user profile
// @access  Private
router.put('/me', 
  authenticateToken, 
  authController.updateProfile
);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', 
  authenticateToken, 
  authController.changePassword
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', 
  authenticateToken, 
  authController.logout
);

module.exports = router;
