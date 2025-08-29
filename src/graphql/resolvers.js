const User = require('../models/User');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const JWTUtils = require('../utils/jwt');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { getPaginationData } = require('../utils/helpers');

// Helper function to check authentication
const requireAuth = (user) => {
  if (!user) {
    throw new AuthenticationError('You must be logged in to perform this action');
  }
};

// Helper function to check admin role
const requireAdmin = (user) => {
  requireAuth(user);
  if (user.role !== 'Admin') {
    throw new ForbiddenError('Admin access required');
  }
};

// Helper function to check ownership or admin
const checkOwnershipOrAdmin = (user, resourceUserId) => {
  requireAuth(user);
  if (user.role !== 'Admin' && user._id.toString() !== resourceUserId.toString()) {
    throw new ForbiddenError('You can only access your own resources');
  }
};

const resolvers = {
  Query: {
    // User queries
    me: async (_, __, { user }) => {
      requireAuth(user);
      return await User.findById(user._id);
    },

    users: async (_, { pagination = {}, filter = {}, sort }, { user }) => {
      requireAdmin(user);
      
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const mongoFilter = {};
      if (filter.role) mongoFilter.role = filter.role;
      if (filter.isActive !== undefined) mongoFilter.isActive = filter.isActive;
      if (filter.search) {
        mongoFilter.$or = [
          { name: { $regex: filter.search, $options: 'i' } },
          { email: { $regex: filter.search, $options: 'i' } }
        ];
      }

      // Build sort
      let mongoSort = { createdAt: -1 };
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        mongoSort = { [sortField]: sortOrder };
      }

      const [users, total] = await Promise.all([
        User.find(mongoFilter).sort(mongoSort).skip(skip).limit(limit),
        User.countDocuments(mongoFilter)
      ]);

      return {
        users,
        pagination: getPaginationData(page, limit, total)
      };
    },

    user: async (_, { id }, { user }) => {
      checkOwnershipOrAdmin(user, id);
      const foundUser = await User.findById(id);
      if (!foundUser) {
        throw new UserInputError('User not found');
      }
      return foundUser;
    },

    // Book queries
    books: async (_, { pagination = {}, filter = {}, sort }) => {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const mongoFilter = { isActive: true };
      if (filter.genre) mongoFilter.genre = filter.genre;
      if (filter.author) mongoFilter.author = { $regex: filter.author, $options: 'i' };
      if (filter.search) {
        mongoFilter.$or = [
          { title: { $regex: filter.search, $options: 'i' } },
          { author: { $regex: filter.search, $options: 'i' } },
          { description: { $regex: filter.search, $options: 'i' } }
        ];
      }
      if (filter.available) mongoFilter.availableCopies = { $gt: 0 };

      // Build sort
      let mongoSort = { createdAt: -1 };
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        mongoSort = { [sortField]: sortOrder };
      }

      const [books, total] = await Promise.all([
        Book.find(mongoFilter).sort(mongoSort).skip(skip).limit(limit),
        Book.countDocuments(mongoFilter)
      ]);

      return {
        books,
        pagination: getPaginationData(page, limit, total)
      };
    },

    book: async (_, { id }) => {
      const book = await Book.findById(id);
      if (!book || !book.isActive) {
        throw new UserInputError('Book not found');
      }
      return book;
    },

    genres: () => {
      return [
        'Fiction', 'NonFiction', 'ScienceFiction', 'Fantasy', 'Mystery', 
        'Romance', 'Thriller', 'Biography', 'History', 'Science', 'Technology',
        'Philosophy', 'Religion', 'SelfHelp', 'Health', 'Travel', 'Cooking',
        'Art', 'Music', 'Sports', 'Politics', 'Economics', 'Education', 'Other'
      ];
    },

    searchBooks: async (_, { query, pagination = {}, filter = {} }) => {
      if (!query) {
        throw new UserInputError('Search query is required');
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      // Build search filter
      const mongoFilter = {
        isActive: true,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { author: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { isbn: { $regex: query, $options: 'i' } }
        ]
      };

      if (filter.genre) mongoFilter.genre = filter.genre;
      if (filter.author) mongoFilter.author = { $regex: filter.author, $options: 'i' };
      if (filter.available) mongoFilter.availableCopies = { $gt: 0 };

      const [books, total] = await Promise.all([
        Book.find(mongoFilter)
          .sort({ borrowCount: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Book.countDocuments(mongoFilter)
      ]);

      return {
        books,
        pagination: getPaginationData(page, limit, total)
      };
    },

    // Borrow queries
    borrowHistory: async (_, { pagination = {}, filter = {} }, { user }) => {
      requireAuth(user);
      
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const mongoFilter = { user: user._id };
      if (filter.status) mongoFilter.status = filter.status;

      const [borrowRecords, total] = await Promise.all([
        BorrowRecord.find(mongoFilter)
          .populate('book')
          .populate('user')
          .sort({ borrowDate: -1 })
          .skip(skip)
          .limit(limit),
        BorrowRecord.countDocuments(mongoFilter)
      ]);

      return {
        borrowRecords,
        pagination: getPaginationData(page, limit, total)
      };
    },

    activeBorrows: async (_, __, { user }) => {
      requireAuth(user);
      return await BorrowRecord.find({
        user: user._id,
        status: { $in: ['Borrowed', 'Overdue'] }
      })
        .populate('book')
        .populate('user')
        .sort({ borrowDate: -1 });
    },

    allBorrowRecords: async (_, { pagination = {}, filter = {}, sort }, { user }) => {
      requireAdmin(user);
      
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const mongoFilter = {};
      if (filter.status) mongoFilter.status = filter.status;
      if (filter.userId) mongoFilter.user = filter.userId;
      if (filter.bookId) mongoFilter.book = filter.bookId;

      let mongoSort = { borrowDate: -1 };
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        mongoSort = { [sortField]: sortOrder };
      }

      const [borrowRecords, total] = await Promise.all([
        BorrowRecord.find(mongoFilter)
          .populate('user')
          .populate('book')
          .sort(mongoSort)
          .skip(skip)
          .limit(limit),
        BorrowRecord.countDocuments(mongoFilter)
      ]);

      return {
        borrowRecords,
        pagination: getPaginationData(page, limit, total)
      };
    },

    overdueBooks: async (_, { pagination = {} }, { user }) => {
      requireAdmin(user);
      
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;

      const filter = {
        $or: [
          { status: 'Overdue' },
          { status: 'Borrowed', dueDate: { $lt: new Date() } }
        ]
      };

      const [borrowRecords, total] = await Promise.all([
        BorrowRecord.find(filter)
          .populate('user')
          .populate('book')
          .sort({ dueDate: 1 })
          .skip(skip)
          .limit(limit),
        BorrowRecord.countDocuments(filter)
      ]);

      return {
        borrowRecords,
        pagination: getPaginationData(page, limit, total)
      };
    },

    // Report queries
    mostBorrowedBooks: async (_, { limit = 10, startDate, endDate }, { user }) => {
      requireAdmin(user);
      
      const matchStage = {};
      if (startDate || endDate) {
        matchStage.borrowDate = {};
        if (startDate) matchStage.borrowDate.$gte = new Date(startDate);
        if (endDate) matchStage.borrowDate.$lte = new Date(endDate);
      }

      const results = await BorrowRecord.aggregate([
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
            as: 'book'
          }
        },
        { $unwind: '$book' },
        {
          $project: {
            book: '$book',
            borrowCount: 1,
            uniqueBorrowers: { $size: '$uniqueBorrowers' },
            lastBorrowed: 1
          }
        },
        { $sort: { borrowCount: -1 } },
        { $limit: limit }
      ]);

      return results;
    },

    activeMembers: async (_, { limit = 10, startDate, endDate }, { user }) => {
      requireAdmin(user);
      
      const matchStage = {};
      if (startDate || endDate) {
        matchStage.borrowDate = {};
        if (startDate) matchStage.borrowDate.$gte = new Date(startDate);
        if (endDate) matchStage.borrowDate.$lte = new Date(endDate);
      }

      const results = await BorrowRecord.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: '$user',
            totalBorrows: { $sum: 1 },
            uniqueBooks: { $addToSet: '$book' },
            lastBorrow: { $max: '$borrowDate' },
            returnedBooks: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } },
            overdueBooks: { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            user: '$user',
            totalBorrows: 1,
            uniqueBooks: { $size: '$uniqueBooks' },
            lastBorrow: 1,
            returnedBooks: 1,
            overdueBooks: 1
          }
        },
        { $sort: { totalBorrows: -1 } },
        { $limit: limit }
      ]);

      return results;
    },

    bookAvailabilityReport: async (_, { genre, author }, { user }) => {
      requireAdmin(user);
      
      const filter = { isActive: true };
      if (genre) filter.genre = genre;
      if (author) filter.author = { $regex: author, $options: 'i' };

      const results = await Book.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBooks: { $sum: 1 },
            totalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' },
            borrowedCopies: { $sum: { $subtract: ['$totalCopies', '$availableCopies'] } },
            booksWithNoCopies: { $sum: { $cond: [{ $eq: ['$availableCopies', 0] }, 1, 0] } }
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
              $multiply: [{ $divide: ['$availableCopies', '$totalCopies'] }, 100]
            }
          }
        }
      ]);

      return results[0] || {
        totalBooks: 0,
        totalCopies: 0,
        availableCopies: 0,
        borrowedCopies: 0,
        booksWithNoCopies: 0,
        availabilityPercentage: 0
      };
    }
  },

  Mutation: {
    // Auth mutations
    register: async (_, { input }) => {
      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw new UserInputError('User already exists with this email');
      }

      const user = await User.create({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role || 'Member'
      });

      const token = JWTUtils.generateToken({
        userId: user._id,
        email: user.email,
        role: user.role
      });

      user.lastLogin = new Date();
      await user.save();

      return { user, token };
    },

    login: async (_, { input }) => {
      const user = await User.findOne({ email: input.email }).select('+password');
      
      if (!user || !user.isActive) {
        throw new UserInputError('Invalid email or password');
      }

      const isPasswordValid = await user.comparePassword(input.password);
      if (!isPasswordValid) {
        throw new UserInputError('Invalid email or password');
      }

      const token = JWTUtils.generateToken({
        userId: user._id,
        email: user.email,
        role: user.role
      });

      user.lastLogin = new Date();
      await user.save();

      return { user, token };
    },

    updateProfile: async (_, { input }, { user }) => {
      requireAuth(user);
      
      const currentUser = await User.findById(user._id);
      
      if (input.email && input.email !== currentUser.email) {
        const existingUser = await User.findOne({ email: input.email });
        if (existingUser) {
          throw new UserInputError('Email already in use');
        }
      }

      Object.assign(currentUser, input);
      await currentUser.save();

      return currentUser;
    },

    changePassword: async (_, { currentPassword, newPassword }, { user }) => {
      requireAuth(user);
      
      const currentUser = await User.findById(user._id).select('+password');
      
      const isCurrentPasswordValid = await currentUser.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new UserInputError('Current password is incorrect');
      }

      currentUser.password = newPassword;
      await currentUser.save();

      return true;
    },

    // User mutations (Admin only)
    createUser: async (_, { input }, { user }) => {
      requireAdmin(user);
      
      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw new UserInputError('User already exists with this email');
      }

      return await User.create({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role || 'Member'
      });
    },

    updateUser: async (_, { id, input }, { user }) => {
      const isOwnProfile = user._id.toString() === id;
      const isAdmin = user.role === 'Admin';
      
      if (!isOwnProfile && !isAdmin) {
        throw new ForbiddenError('Access denied');
      }

      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new UserInputError('User not found');
      }

      if (input.email && input.email !== targetUser.email) {
        const existingUser = await User.findOne({ email: input.email });
        if (existingUser) {
          throw new UserInputError('Email already in use');
        }
      }

      // Only admins can change role and isActive status
      if (!isAdmin && (input.role !== undefined || input.isActive !== undefined)) {
        throw new ForbiddenError('Only admins can change role or account status');
      }

      Object.assign(targetUser, input);
      await targetUser.save();

      return targetUser;
    },

    deleteUser: async (_, { id }, { user }) => {
      requireAdmin(user);
      
      if (user._id.toString() === id) {
        throw new UserInputError('You cannot delete your own account');
      }

      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new UserInputError('User not found');
      }

      targetUser.isActive = false;
      await targetUser.save();

      return true;
    },

    // Book mutations (Admin only)
    addBook: async (_, { input }, { user }) => {
      requireAdmin(user);
      
      const existingBook = await Book.findOne({ isbn: input.isbn });
      if (existingBook) {
        throw new UserInputError('Book with this ISBN already exists');
      }

      return await Book.create({
        ...input,
        availableCopies: input.totalCopies
      });
    },

    updateBook: async (_, { id, input }, { user }) => {
      requireAdmin(user);
      
      const book = await Book.findById(id);
      if (!book) {
        throw new UserInputError('Book not found');
      }

      if (input.isbn && input.isbn !== book.isbn) {
        const existingBook = await Book.findOne({ isbn: input.isbn });
        if (existingBook) {
          throw new UserInputError('Book with this ISBN already exists');
        }
      }

      if (input.totalCopies !== undefined) {
        const borrowedCopies = book.totalCopies - book.availableCopies;
        
        if (input.totalCopies < borrowedCopies) {
          throw new UserInputError(
            `Cannot reduce total copies below ${borrowedCopies} (currently borrowed copies)`
          );
        }
        
        book.availableCopies = input.totalCopies - borrowedCopies;
        book.totalCopies = input.totalCopies;
      }

      Object.assign(book, input);
      await book.save();

      return book;
    },

    deleteBook: async (_, { id }, { user }) => {
      requireAdmin(user);
      
      const book = await Book.findById(id);
      if (!book) {
        throw new UserInputError('Book not found');
      }

      if (book.availableCopies < book.totalCopies) {
        throw new UserInputError('Cannot delete book with borrowed copies');
      }

      book.isActive = false;
      await book.save();

      return true;
    },

    // Borrow mutations
    borrowBook: async (_, { input }, { user }) => {
      requireAuth(user);
      
      const book = await Book.findById(input.bookId);
      if (!book || !book.isActive) {
        throw new UserInputError('Book not found');
      }

      if (!book.isAvailable()) {
        throw new UserInputError('Book is not available for borrowing');
      }

      const existingBorrow = await BorrowRecord.findOne({
        user: user._id,
        book: input.bookId,
        status: { $in: ['Borrowed', 'Overdue'] }
      });

      if (existingBorrow) {
        throw new UserInputError('You have already borrowed this book');
      }

      const activeBorrows = await BorrowRecord.countDocuments({
        user: user._id,
        status: { $in: ['Borrowed', 'Overdue'] }
      });

      if (activeBorrows >= 5) {
        throw new UserInputError('Borrowing limit reached (maximum 5 books)');
      }

      const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const borrowRecord = await BorrowRecord.create({
        user: user._id,
        book: input.bookId,
        dueDate
      });

      book.borrowCopy();
      await book.save();

      return await BorrowRecord.findById(borrowRecord._id).populate('user').populate('book');
    },

    returnBook: async (_, { id }, { user }) => {
      requireAuth(user);
      
      const borrowRecord = await BorrowRecord.findById(id).populate('user').populate('book');
      
      if (!borrowRecord) {
        throw new UserInputError('Borrow record not found');
      }

      if (borrowRecord.user._id.toString() !== user._id.toString() && user.role !== 'Admin') {
        throw new ForbiddenError('Access denied');
      }

      if (borrowRecord.status === 'Returned') {
        throw new UserInputError('Book has already been returned');
      }

      borrowRecord.returnBook();
      await borrowRecord.save();

      const book = await Book.findById(borrowRecord.book._id);
      book.returnCopy();
      await book.save();

      return borrowRecord;
    },

    renewBook: async (_, { id }, { user }) => {
      requireAuth(user);
      
      const borrowRecord = await BorrowRecord.findById(id).populate('user').populate('book');
      
      if (!borrowRecord) {
        throw new UserInputError('Borrow record not found');
      }

      if (borrowRecord.user._id.toString() !== user._id.toString()) {
        throw new ForbiddenError('Access denied');
      }

      if (borrowRecord.status !== 'Borrowed' && borrowRecord.status !== 'Overdue') {
        throw new UserInputError('Only borrowed or overdue books can be renewed');
      }

      try {
        borrowRecord.renewBook();
        await borrowRecord.save();
        return borrowRecord;
      } catch (error) {
        throw new UserInputError(error.message);
      }
    }
  },

  // Type resolvers for virtual fields
  Book: {
    borrowedCopies: (book) => book.totalCopies - book.availableCopies
  },

  BorrowRecord: {
    isOverdue: (borrowRecord) => {
      if (borrowRecord.status === 'Returned' || borrowRecord.status === 'Lost') {
        return false;
      }
      return new Date() > borrowRecord.dueDate;
    },
    
    daysBorrowed: (borrowRecord) => {
      const endDate = borrowRecord.returnDate || new Date();
      const diffTime = Math.abs(endDate - borrowRecord.borrowDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    daysOverdue: (borrowRecord) => {
      if (borrowRecord.status === 'Returned' || borrowRecord.status === 'Lost') {
        return 0;
      }
      if (new Date() <= borrowRecord.dueDate) {
        return 0;
      }
      const diffTime = Math.abs(new Date() - borrowRecord.dueDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }
};

module.exports = resolvers;
