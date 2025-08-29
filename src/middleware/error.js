const { validationResult } = require('express-validator');
const { validationErrorResponse } = require('../utils/helpers');

/**
 * Validation middleware to handle express-validator results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors.array());
  }
  
  next();
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    return res.status(400).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    return res.status(400).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      timestamp: new Date().toISOString()
    });
  }

  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 Not Found middleware
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  res.status(404).json({
    success: false,
    message: error.message,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  handleValidationErrors,
  errorHandler,
  notFound
};
