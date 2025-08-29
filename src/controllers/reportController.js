const Book = require('../models/Book');
const User = require('../models/User');
const BorrowRecord = require('../models/BorrowRecord');
const { successResponse, errorResponse, asyncHandler } = require('../utils/helpers');

/**
 * Get most borrowed books report
 * @route GET /api/reports/most-borrowed-books
 * @access Private/Admin
 */
const getMostBorrowedBooks = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

  // Build match stage for date filtering
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.borrowDate = {};
    if (startDate) matchStage.borrowDate.$gte = startDate;
    if (endDate) matchStage.borrowDate.$lte = endDate;
  }

  const mostBorrowedBooks = await BorrowRecord.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: '$book',
        borrowCount: { $sum: 1 },
        uniqueBorrowers: { $addToSet: '$user' },
        lastBorrowed: { $max: '$borrowDate' }
      }
    },
    {
      $lookup: {
        from: 'books',
        localField: '_id',
        foreignField: '_id',
        as: 'bookDetails'
      }
    },
    {
      $unwind: '$bookDetails'
    },
    {
      $project: {
        _id: 1,
        borrowCount: 1,
        uniqueBorrowers: { $size: '$uniqueBorrowers' },
        lastBorrowed: 1,
        title: '$bookDetails.title',
        author: '$bookDetails.author',
        isbn: '$bookDetails.isbn',
        genre: '$bookDetails.genre',
        totalCopies: '$bookDetails.totalCopies',
        availableCopies: '$bookDetails.availableCopies'
      }
    },
    {
      $sort: { borrowCount: -1 }
    },
    {
      $limit: limit
    }
  ]);

  successResponse(res, {
    mostBorrowedBooks,
    reportGeneratedAt: new Date(),
    filters: {
      startDate,
      endDate,
      limit
    }
  }, 'Most borrowed books report generated successfully');
});

/**
 * Get most active members report
 * @route GET /api/reports/active-members
 * @access Private/Admin
 */
const getActiveMembersReport = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

  // Build match stage for date filtering
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.borrowDate = {};
    if (startDate) matchStage.borrowDate.$gte = startDate;
    if (endDate) matchStage.borrowDate.$lte = endDate;
  }

  const activeMembers = await BorrowRecord.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: '$user',
        totalBorrows: { $sum: 1 },
        uniqueBooks: { $addToSet: '$book' },
        lastBorrow: { $max: '$borrowDate' },
        returnedBooks: {
          $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] }
        },
        overdueBooks: {
          $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    {
      $unwind: '$userDetails'
    },
    {
      $project: {
        _id: 1,
        totalBorrows: 1,
        uniqueBooks: { $size: '$uniqueBooks' },
        lastBorrow: 1,
        returnedBooks: 1,
        overdueBooks: 1,
        name: '$userDetails.name',
        email: '$userDetails.email',
        role: '$userDetails.role',
        memberSince: '$userDetails.createdAt'
      }
    },
    {
      $sort: { totalBorrows: -1 }
    },
    {
      $limit: limit
    }
  ]);

  successResponse(res, {
    activeMembers,
    reportGeneratedAt: new Date(),
    filters: {
      startDate,
      endDate,
      limit
    }
  }, 'Active members report generated successfully');
});

/**
 * Get book availability summary
 * @route GET /api/reports/book-availability
 * @access Private/Admin
 */
const getBookAvailabilityReport = asyncHandler(async (req, res) => {
  const genre = req.query.genre;
  const author = req.query.author;

  // Build filter
  const filter = { isActive: true };
  if (genre) filter.genre = genre;
  if (author) filter.author = { $regex: author, $options: 'i' };

  const availabilityReport = await Book.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalBooks: { $sum: 1 },
        totalCopies: { $sum: '$totalCopies' },
        availableCopies: { $sum: '$availableCopies' },
        borrowedCopies: { $sum: { $subtract: ['$totalCopies', '$availableCopies'] } },
        booksWithNoCopies: {
          $sum: { $cond: [{ $eq: ['$availableCopies', 0] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalBooks: 1,
        totalCopies: 1,
        availableCopies: 1,
        borrowedCopies: 1,
        booksWithNoCopies: 1,
        availabilityPercentage: {
          $multiply: [
            { $divide: ['$availableCopies', '$totalCopies'] },
            100
          ]
        }
      }
    }
  ]);

  // Get genre-wise breakdown
  const genreBreakdown = await Book.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$genre',
        totalBooks: { $sum: 1 },
        totalCopies: { $sum: '$totalCopies' },
        availableCopies: { $sum: '$availableCopies' },
        borrowedCopies: { $sum: { $subtract: ['$totalCopies', '$availableCopies'] } }
      }
    },
    {
      $project: {
        genre: '$_id',
        _id: 0,
        totalBooks: 1,
        totalCopies: 1,
        availableCopies: 1,
        borrowedCopies: 1,
        availabilityPercentage: {
          $multiply: [
            { $divide: ['$availableCopies', '$totalCopies'] },
            100
          ]
        }
      }
    },
    {
      $sort: { totalBooks: -1 }
    }
  ]);

  // Get books with low availability (less than 2 copies available)
  const lowAvailabilityBooks = await Book.find({
    ...filter,
    availableCopies: { $lt: 2, $gte: 0 }
  })
    .select('title author isbn genre totalCopies availableCopies')
    .sort({ availableCopies: 1 })
    .limit(20);

  successResponse(res, {
    summary: availabilityReport[0] || {
      totalBooks: 0,
      totalCopies: 0,
      availableCopies: 0,
      borrowedCopies: 0,
      booksWithNoCopies: 0,
      availabilityPercentage: 0
    },
    genreBreakdown,
    lowAvailabilityBooks,
    reportGeneratedAt: new Date(),
    filters: { genre, author }
  }, 'Book availability report generated successfully');
});

/**
 * Get borrowing trends report
 * @route GET /api/reports/borrowing-trends
 * @access Private/Admin
 */
const getBorrowingTrendsReport = asyncHandler(async (req, res) => {
  const period = req.query.period || 'monthly'; // daily, weekly, monthly, yearly
  const year = parseInt(req.query.year) || new Date().getFullYear();

  let groupBy;
  let sortBy;

  switch (period) {
    case 'daily':
      groupBy = {
        year: { $year: '$borrowDate' },
        month: { $month: '$borrowDate' },
        day: { $dayOfMonth: '$borrowDate' }
      };
      sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
      break;
    case 'weekly':
      groupBy = {
        year: { $year: '$borrowDate' },
        week: { $week: '$borrowDate' }
      };
      sortBy = { '_id.year': 1, '_id.week': 1 };
      break;
    case 'yearly':
      groupBy = {
        year: { $year: '$borrowDate' }
      };
      sortBy = { '_id.year': 1 };
      break;
    default: // monthly
      groupBy = {
        year: { $year: '$borrowDate' },
        month: { $month: '$borrowDate' }
      };
      sortBy = { '_id.year': 1, '_id.month': 1 };
  }

  const trends = await BorrowRecord.aggregate([
    {
      $match: {
        borrowDate: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: groupBy,
        totalBorrows: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueBooks: { $addToSet: '$book' },
        returns: {
          $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 1,
        totalBorrows: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueBooks: { $size: '$uniqueBooks' },
        returns: 1,
        returnRate: {
          $multiply: [
            { $divide: ['$returns', '$totalBorrows'] },
            100
          ]
        }
      }
    },
    {
      $sort: sortBy
    }
  ]);

  successResponse(res, {
    trends,
    period,
    year,
    reportGeneratedAt: new Date()
  }, 'Borrowing trends report generated successfully');
});

/**
 * Get library statistics dashboard
 * @route GET /api/reports/dashboard
 * @access Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Get overall statistics
  const [
    totalBooks,
    totalUsers,
    activeBorrows,
    overdueBooks,
    monthlyBorrows,
    yearlyBorrows
  ] = await Promise.all([
    Book.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true }),
    BorrowRecord.countDocuments({ status: { $in: ['Borrowed', 'Overdue'] } }),
    BorrowRecord.countDocuments({ 
      $or: [
        { status: 'Overdue' },
        { status: 'Borrowed', dueDate: { $lt: today } }
      ]
    }),
    BorrowRecord.countDocuments({ borrowDate: { $gte: startOfMonth } }),
    BorrowRecord.countDocuments({ borrowDate: { $gte: startOfYear } })
  ]);

  // Get recent activities
  const recentBorrows = await BorrowRecord.find()
    .populate('user', 'name email')
    .populate('book', 'title author')
    .sort({ borrowDate: -1 })
    .limit(5);

  const recentReturns = await BorrowRecord.find({ status: 'Returned' })
    .populate('user', 'name email')
    .populate('book', 'title author')
    .sort({ returnDate: -1 })
    .limit(5);

  // Get popular genres
  const popularGenres = await Book.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$genre',
        count: { $sum: 1 },
        totalBorrows: { $sum: '$borrowCount' }
      }
    },
    {
      $sort: { totalBorrows: -1 }
    },
    {
      $limit: 5
    }
  ]);

  successResponse(res, {
    overview: {
      totalBooks,
      totalUsers,
      activeBorrows,
      overdueBooks,
      monthlyBorrows,
      yearlyBorrows
    },
    recentActivities: {
      recentBorrows,
      recentReturns
    },
    popularGenres,
    reportGeneratedAt: new Date()
  }, 'Dashboard statistics retrieved successfully');
});

module.exports = {
  getMostBorrowedBooks,
  getActiveMembersReport,
  getBookAvailabilityReport,
  getBorrowingTrendsReport,
  getDashboardStats
};
