const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { userUpdateValidation, mongoIdValidation, paginationValidation } = require('../middleware/validation');
const { handleValidationErrors } = require('../middleware/error');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', 
  authenticateToken, 
  authorizeRoles('Admin'),
  paginationValidation,
  handleValidationErrors,
  userController.getUsers
);

// @route   GET /api/users/stats
// @desc    Get user statistics (Admin only)
// @access  Private/Admin
router.get('/stats', 
  authenticateToken, 
  authorizeRoles('Admin'),
  userController.getUserStats
);

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin or own profile)
// @access  Private
router.get('/:id', 
  authenticateToken,
  mongoIdValidation,
  handleValidationErrors,
  userController.getUserById
);

// @route   POST /api/users
// @desc    Create new user (Admin only)
// @access  Private/Admin
router.post('/', 
  authenticateToken, 
  authorizeRoles('Admin'),
  userUpdateValidation,
  handleValidationErrors,
  userController.createUser
);

// @route   PUT /api/users/:id
// @desc    Update user (Admin or own profile)
// @access  Private
router.put('/:id', 
  authenticateToken,
  mongoIdValidation,
  userUpdateValidation,
  handleValidationErrors,
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('Admin'),
  mongoIdValidation,
  handleValidationErrors,
  userController.deleteUser
);

module.exports = router;
