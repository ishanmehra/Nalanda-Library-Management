const { body, param, query } = require('express-validator');

// User validation schemas
const userRegistrationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['Admin', 'Member'])
    .withMessage('Role must be either Admin or Member')
];

const userLoginValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const userUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('role')
    .optional()
    .isIn(['Admin', 'Member'])
    .withMessage('Role must be either Admin or Member')
];

// Book validation schemas
const bookValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('author')
    .trim()
    .notEmpty()
    .withMessage('Author is required')
    .isLength({ max: 100 })
    .withMessage('Author name cannot exceed 100 characters'),
  
  body('isbn')
    .trim()
    .notEmpty()
    .withMessage('ISBN is required')
    .matches(/^(?:ISBN(?:-1[03])?:?\s)?(?=[-0-9\s]{17}$|[-0-9X\s]{13}$|[0-9X]{10}$)(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?(?:[0-9]+[-\s]?){2}[0-9X]$/)
    .withMessage('Please enter a valid ISBN'),
  
  body('publicationDate')
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .isBefore()
    .withMessage('Publication date cannot be in the future'),
  
  body('genre')
    .notEmpty()
    .withMessage('Genre is required')
    .isIn([
      'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
      'Romance', 'Thriller', 'Biography', 'History', 'Science', 'Technology',
      'Philosophy', 'Religion', 'Self-Help', 'Health', 'Travel', 'Cooking',
      'Art', 'Music', 'Sports', 'Politics', 'Economics', 'Education', 'Other'
    ])
    .withMessage('Genre must be from the predefined list'),
  
  body('totalCopies')
    .isInt({ min: 1 })
    .withMessage('Total copies must be at least 1'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('language')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Language cannot exceed 50 characters'),
  
  body('publisher')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Publisher name cannot exceed 100 characters'),
  
  body('pages')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pages must be at least 1')
];

const bookUpdateValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  
  body('author')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Author cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Author name cannot exceed 100 characters'),
  
  body('isbn')
    .optional()
    .trim()
    .matches(/^(?:ISBN(?:-1[03])?:?\s)?(?=[-0-9\s]{17}$|[-0-9X\s]{13}$|[0-9X]{10}$)(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?(?:[0-9]+[-\s]?){2}[0-9X]$/)
    .withMessage('Please enter a valid ISBN'),
  
  body('publicationDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .isBefore()
    .withMessage('Publication date cannot be in the future'),
  
  body('genre')
    .optional()
    .isIn([
      'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
      'Romance', 'Thriller', 'Biography', 'History', 'Science', 'Technology',
      'Philosophy', 'Religion', 'Self-Help', 'Health', 'Travel', 'Cooking',
      'Art', 'Music', 'Sports', 'Politics', 'Economics', 'Education', 'Other'
    ])
    .withMessage('Genre must be from the predefined list'),
  
  body('totalCopies')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total copies must be at least 1'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
];

// Common validation schemas
const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'name', '-name', 'title', '-title', 'author', '-author'])
    .withMessage('Invalid sort field')
];

const borrowBookValidation = [
  body('bookId')
    .notEmpty()
    .withMessage('Book ID is required')
    .isMongoId()
    .withMessage('Invalid book ID format'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid due date in ISO format')
    .isAfter()
    .withMessage('Due date must be in the future')
];

module.exports = {
  userRegistrationValidation,
  userLoginValidation,
  userUpdateValidation,
  bookValidation,
  bookUpdateValidation,
  mongoIdValidation,
  paginationValidation,
  borrowBookValidation
};
