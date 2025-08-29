/**
 * Success response handler
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error response handler
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code
 * @param {*} error - Error details
 */
const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Only include error details in development
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response handler
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors
 */
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Validation Error',
    errors: errors.map(error => ({
      field: error.param || error.path,
      message: error.msg || error.message,
      value: error.value
    })),
    timestamp: new Date().toISOString()
  });
};

/**
 * Pagination helper
 * @param {Number} page - Current page number
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items count
 */
const getPaginationData = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Async error handler wrapper
 * @param {Function} fn - Async function to wrap
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Generate random string
 * @param {Number} length - Length of random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date to readable string
 * @param {Date} date - Date to format
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  getPaginationData,
  asyncHandler,
  generateRandomString,
  formatDate
};
