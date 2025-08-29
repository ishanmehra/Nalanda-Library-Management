const express = require('express');
const router = express.Router();

const bookController = require('../controllers/bookController');
const { bookValidation, bookUpdateValidation, mongoIdValidation, paginationValidation } = require('../middleware/validation');
const { handleValidationErrors } = require('../middleware/error');
const { authenticateToken, authorizeRoles, optionalAuth } = require('../middleware/auth');

// @route   GET /api/books/genres
// @desc    Get all available genres
// @access  Public
router.get('/genres', bookController.getGenres);

// @route   GET /api/books/search
// @desc    Search books
// @access  Public
router.get('/search', 
  paginationValidation,
  handleValidationErrors,
  bookController.searchBooks
);

// @route   GET /api/books
// @desc    Get all books with pagination and filtering
// @access  Public
router.get('/', 
  optionalAuth,
  paginationValidation,
  handleValidationErrors,
  bookController.getBooks
);

// @route   GET /api/books/:id
// @desc    Get book by ID
// @access  Public
router.get('/:id', 
  mongoIdValidation,
  handleValidationErrors,
  bookController.getBookById
);

// @route   POST /api/books
// @desc    Add new book (Admin only)
// @access  Private/Admin
router.post('/', 
  authenticateToken, 
  authorizeRoles('Admin'),
  bookValidation,
  handleValidationErrors,
  bookController.addBook
);

// @route   PUT /api/books/:id
// @desc    Update book (Admin only)
// @access  Private/Admin
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('Admin'),
  mongoIdValidation,
  bookUpdateValidation,
  handleValidationErrors,
  bookController.updateBook
);

// @route   DELETE /api/books/:id
// @desc    Delete book (Admin only)
// @access  Private/Admin
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('Admin'),
  mongoIdValidation,
  handleValidationErrors,
  bookController.deleteBook
);

module.exports = router;
