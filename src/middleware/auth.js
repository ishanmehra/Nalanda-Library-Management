const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse, asyncHandler } = require('../utils/helpers');

/**
 * Authenticate user with JWT token
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return errorResponse(res, 'Access denied. No token provided.', 401);
  }

  try {
    // Verify and decode token
    const decoded = JWTUtils.verifyToken(token);
    
    // Get user from database (excluding password)
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return errorResponse(res, 'Token is valid but user not found.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account has been deactivated.', 401);
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, error.message, 401);
  }
});

/**
 * Authorize user based on roles
 * @param {...string} roles - Allowed roles
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, `Access denied. Required role: ${roles.join(' or ')}`, 403);
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = JWTUtils.verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

/**
 * Check if user owns the resource or is admin
 */
const checkOwnership = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    // Admin can access everything
    if (req.user.role === 'Admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params.userId || req.body[resourceUserField] || req.user._id;
    
    if (req.user._id.toString() !== resourceUserId.toString()) {
      return errorResponse(res, 'Access denied. You can only access your own resources.', 403);
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth,
  checkOwnership
};
