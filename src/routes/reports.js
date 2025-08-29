const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const { handleValidationErrors } = require('../middleware/error');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// @route   GET /api/reports/dashboard
// @desc    Get library statistics dashboard
// @access  Private/Admin
router.get('/dashboard', 
  authenticateToken,
  authorizeRoles('Admin'),
  reportController.getDashboardStats
);

// @route   GET /api/reports/most-borrowed-books
// @desc    Get most borrowed books report
// @access  Private/Admin
router.get('/most-borrowed-books', 
  authenticateToken,
  authorizeRoles('Admin'),
  reportController.getMostBorrowedBooks
);

// @route   GET /api/reports/active-members
// @desc    Get most active members report
// @access  Private/Admin
router.get('/active-members', 
  authenticateToken,
  authorizeRoles('Admin'),
  reportController.getActiveMembersReport
);

// @route   GET /api/reports/book-availability
// @desc    Get book availability summary
// @access  Private/Admin
router.get('/book-availability', 
  authenticateToken,
  authorizeRoles('Admin'),
  reportController.getBookAvailabilityReport
);

// @route   GET /api/reports/borrowing-trends
// @desc    Get borrowing trends report
// @access  Private/Admin
router.get('/borrowing-trends', 
  authenticateToken,
  authorizeRoles('Admin'),
  reportController.getBorrowingTrendsReport
);

module.exports = router;
