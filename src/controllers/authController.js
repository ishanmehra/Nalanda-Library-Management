const User = require('../models/User');
const JWTUtils = require('../utils/jwt');
const { successResponse, errorResponse, asyncHandler } = require('../utils/helpers');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'User already exists with this email', 400);
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'Member'
  });

  // Generate token
  const token = JWTUtils.generateToken({
    userId: user._id,
    email: user.email,
    role: user.role
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    token
  }, 'User registered successfully', 201);
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  if (!user.isActive) {
    return errorResponse(res, 'Account has been deactivated', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  // Generate token
  const token = JWTUtils.generateToken({
    userId: user._id,
    email: user.email,
    role: user.role
  });

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin
    },
    token
  }, 'Login successful');
});

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }, 'User profile retrieved successfully');
});

/**
 * Update user profile
 * @route PUT /api/auth/me
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'Email already in use', 400);
    }
  }

  // Update user
  user.name = name || user.name;
  user.email = email || user.email;
  
  await user.save();

  successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      updatedAt: user.updatedAt
    }
  }, 'Profile updated successfully');
});

/**
 * Change password
 * @route PUT /api/auth/change-password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return errorResponse(res, 'Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  successResponse(res, null, 'Password changed successfully');
});

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = asyncHandler(async (req, res) => {
  // In a real application, you might want to maintain a blacklist of tokens
  // For now, we'll just send a success response
  successResponse(res, null, 'Logged out successfully');
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
};
