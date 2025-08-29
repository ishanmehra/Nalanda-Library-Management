const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');
const User = require('../models/User');
const { successResponse, errorResponse, getPaginationData, asyncHandler } = require('../utils/helpers');

/**
 * Borrow a book
 * @route POST /api/borrow
 * @access Private/Member
 */
const borrowBook = asyncHandler(async (req, res) => {
  const { bookId, dueDate } = req.body;
  const userId = req.user._id;

  // Check if book exists and is available
  const book = await Book.findById(bookId);
  if (!book || !book.isActive) {
    return errorResponse(res, 'Book not found', 404);
  }

  if (!book.isAvailable()) {
    return errorResponse(res, 'Book is not available for borrowing', 400);
  }

  // Check if user has already borrowed this book and not returned
  const existingBorrow = await BorrowRecord.findOne({
    user: userId,
    book: bookId,
    status: { $in: ['Borrowed', 'Overdue'] }
  });

  if (existingBorrow) {
    return errorResponse(res, 'You have already borrowed this book', 400);
  }

  // Check if user has reached borrowing limit (e.g., 5 books)
  const activeBorrows = await BorrowRecord.countDocuments({
    user: userId,
    status: { $in: ['Borrowed', 'Overdue'] }
  });

  if (activeBorrows >= 5) {
    return errorResponse(res, 'Borrowing limit reached (maximum 5 books)', 400);
  }

  // Calculate due date (default 14 days from now)
  const borrowDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Create borrow record
  const borrowRecord = await BorrowRecord.create({
    user: userId,
    book: bookId,
    dueDate: borrowDueDate
  });

  // Update book availability
  book.borrowCopy();
  await book.save();

  // Populate the response
  await borrowRecord.populate([
    { path: 'user', select: 'name email' },
    { path: 'book', select: 'title author isbn' }
  ]);

  successResponse(res, { borrowRecord }, 'Book borrowed successfully', 201);
});

/**
 * Return a book
 * @route PUT /api/borrow/:id/return
 * @access Private/Member
 */
const returnBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Find borrow record
  const borrowRecord = await BorrowRecord.findById(id).populate([
    { path: 'user', select: 'name email' },
    { path: 'book', select: 'title author isbn' }
  ]);

  if (!borrowRecord) {
    return errorResponse(res, 'Borrow record not found', 404);
  }

  // Check if user owns this borrow record or is admin
  if (borrowRecord.user._id.toString() !== userId.toString() && req.user.role !== 'Admin') {
    return errorResponse(res, 'Access denied', 403);
  }

  // Check if book is already returned
  if (borrowRecord.status === 'Returned') {
    return errorResponse(res, 'Book has already been returned', 400);
  }

  // Return the book
  borrowRecord.returnBook();
  await borrowRecord.save();

  // Update book availability
  const book = await Book.findById(borrowRecord.book._id);
  book.returnCopy();
  await book.save();

  successResponse(res, { borrowRecord }, 'Book returned successfully');
});

/**
 * Get borrowing history for current user
 * @route GET /api/borrow/history
 * @access Private/Member
 */
const getBorrowHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { user: userId };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  // Build sort
  const sort = { borrowDate: -1 };

  // Execute queries
  const [borrowRecords, total] = await Promise.all([
    BorrowRecord.find(filter)
      .populate('book', 'title author isbn genre')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    BorrowRecord.countDocuments(filter)
  ]);

  const pagination = getPaginationData(page, limit, total);

  successResponse(res, {
    borrowRecords,
    pagination
  }, 'Borrow history retrieved successfully');
});

/**
 * Get all borrow records (Admin only)
 * @route GET /api/borrow
 * @access Private/Admin
 */
const getAllBorrowRecords = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.userId) {
    filter.user = req.query.userId;
  }
  if (req.query.bookId) {
    filter.book = req.query.bookId;
  }

  // Build sort
  let sort = { borrowDate: -1 };
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
    sort = { [sortField]: sortOrder };
  }

  // Execute queries
  const [borrowRecords, total] = await Promise.all([
    BorrowRecord.find(filter)
      .populate('user', 'name email')
      .populate('book', 'title author isbn genre')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    BorrowRecord.countDocuments(filter)
  ]);

  const pagination = getPaginationData(page, limit, total);

  successResponse(res, {
    borrowRecords,
    pagination
  }, 'Borrow records retrieved successfully');
});

/**
 * Renew a borrowed book
 * @route PUT /api/borrow/:id/renew
 * @access Private/Member
 */
const renewBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Find borrow record
  const borrowRecord = await BorrowRecord.findById(id).populate([
    { path: 'user', select: 'name email' },
    { path: 'book', select: 'title author isbn' }
  ]);

  if (!borrowRecord) {
    return errorResponse(res, 'Borrow record not found', 404);
  }

  // Check if user owns this borrow record
  if (borrowRecord.user._id.toString() !== userId.toString()) {
    return errorResponse(res, 'Access denied', 403);
  }

  // Check if book can be renewed
  if (borrowRecord.status !== 'Borrowed' && borrowRecord.status !== 'Overdue') {
    return errorResponse(res, 'Only borrowed or overdue books can be renewed', 400);
  }

  try {
    borrowRecord.renewBook();
    await borrowRecord.save();

    successResponse(res, { borrowRecord }, 'Book renewed successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

/**
 * Get overdue books
 * @route GET /api/borrow/overdue
 * @access Private/Admin
 */
const getOverdueBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Find overdue books
  const filter = {
    $or: [
      { status: 'Overdue' },
      {
        status: 'Borrowed',
        dueDate: { $lt: new Date() }
      }
    ]
  };

  const [borrowRecords, total] = await Promise.all([
    BorrowRecord.find(filter)
      .populate('user', 'name email')
      .populate('book', 'title author isbn')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit),
    BorrowRecord.countDocuments(filter)
  ]);

  const pagination = getPaginationData(page, limit, total);

  successResponse(res, {
    borrowRecords,
    pagination
  }, 'Overdue books retrieved successfully');
});

/**
 * Get current user's active borrows
 * @route GET /api/borrow/active
 * @access Private/Member
 */
const getActiveBorrows = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const activeBorrows = await BorrowRecord.find({
    user: userId,
    status: { $in: ['Borrowed', 'Overdue'] }
  })
    .populate('book', 'title author isbn genre')
    .sort({ borrowDate: -1 });

  successResponse(res, { 
    activeBorrows,
    count: activeBorrows.length 
  }, 'Active borrows retrieved successfully');
});

module.exports = {
  borrowBook,
  returnBook,
  getBorrowHistory,
  getAllBorrowRecords,
  renewBook,
  getOverdueBooks,
  getActiveBorrows
};
