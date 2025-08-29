const User = require('../models/User');
const { successResponse, errorResponse, getPaginationData, asyncHandler } = require('../utils/helpers');

/**
 * Get all users (Admin only)
 * @route GET /api/users
 * @access Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  // Build sort
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
    sort = { [sortField]: sortOrder };
  }

  // Execute queries
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  const pagination = getPaginationData(page, limit, total);

  successResponse(res, {
    users,
    pagination
  }, 'Users retrieved successfully');
});

/**
 * Get user by ID (Admin or own profile)
 * @route GET /api/users/:id
 * @access Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if user is trying to access their own profile or is admin
  if (req.user.role !== 'Admin' && req.user._id.toString() !== id) {
    return errorResponse(res, 'Access denied', 403);
  }

  const user = await User.findById(id).select('-password');
  
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  successResponse(res, { user }, 'User retrieved successfully');
});

/**
 * Create new user (Admin only)
 * @route POST /api/users
 * @access Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
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

  successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }
  }, 'User created successfully', 201);
});

/**
 * Update user (Admin or own profile)
 * @route PUT /api/users/:id
 * @access Private
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;
  
  // Check permissions
  const isOwnProfile = req.user._id.toString() === id;
  const isAdmin = req.user.role === 'Admin';
  
  if (!isOwnProfile && !isAdmin) {
    return errorResponse(res, 'Access denied', 403);
  }

  const user = await User.findById(id);
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

  // Only admins can change role and isActive status
  if (!isAdmin && (role !== undefined || isActive !== undefined)) {
    return errorResponse(res, 'Only admins can change role or account status', 403);
  }

  // Update user
  user.name = name || user.name;
  user.email = email || user.email;
  
  if (isAdmin) {
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
  }

  await user.save();

  successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    }
  }, 'User updated successfully');
});

/**
 * Delete user (Admin only)
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Prevent admin from deleting themselves
  if (req.user._id.toString() === id) {
    return errorResponse(res, 'You cannot delete your own account', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Soft delete by deactivating the account
  user.isActive = false;
  await user.save();

  successResponse(res, null, 'User deactivated successfully');
});

/**
 * Get user statistics (Admin only)
 * @route GET /api/users/stats
 * @access Private/Admin
 */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        admins: {
          $sum: { $cond: [{ $eq: ['$role', 'Admin'] }, 1, 0] }
        },
        members: {
          $sum: { $cond: [{ $eq: ['$role', 'Member'] }, 1, 0] }
        }
      }
    }
  ]);

  const recentUsers = await User.find({ isActive: true })
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  successResponse(res, {
    stats: stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      admins: 0,
      members: 0
    },
    recentUsers
  }, 'User statistics retrieved successfully');
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
};
