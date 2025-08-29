const express = require('express');
const router = express.Router();

const borrowController = require('../controllers/borrowController');
const { borrowBookValidation, mongoIdValidation, paginationValidation } = require('../middleware/validation');
const { handleValidationErrors } = require('../middleware/error');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// @route   POST /api/borrow
// @desc    Borrow a book
// @access  Private/Member
router.post('/', 
  authenticateToken,
  borrowBookValidation,
  handleValidationErrors,
  borrowController.borrowBook
);

// @route   GET /api/borrow/history
// @desc    Get borrowing history for current user
// @access  Private/Member
router.get('/history', 
  authenticateToken,
  paginationValidation,
  handleValidationErrors,
  borrowController.getBorrowHistory
);

// @route   GET /api/borrow/active
// @desc    Get current user's active borrows
// @access  Private/Member
router.get('/active', 
  authenticateToken,
  borrowController.getActiveBorrows
);

// @route   GET /api/borrow/overdue
// @desc    Get overdue books (Admin only)
// @access  Private/Admin
router.get('/overdue', 
  authenticateToken,
  authorizeRoles('Admin'),
  paginationValidation,
  handleValidationErrors,
  borrowController.getOverdueBooks
);

// @route   GET /api/borrow
// @desc    Get all borrow records (Admin only)
// @access  Private/Admin
router.get('/', 
  authenticateToken,
  authorizeRoles('Admin'),
  paginationValidation,
  handleValidationErrors,
  borrowController.getAllBorrowRecords
);

// @route   PUT /api/borrow/:id/return
// @desc    Return a book
// @access  Private/Member
router.put('/:id/return', 
  authenticateToken,
  mongoIdValidation,
  handleValidationErrors,
  borrowController.returnBook
);

// @route   PUT /api/borrow/:id/renew
// @desc    Renew a borrowed book
// @access  Private/Member
router.put('/:id/renew', 
  authenticateToken,
  mongoIdValidation,
  handleValidationErrors,
  borrowController.renewBook
);

module.exports = router;
