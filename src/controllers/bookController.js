const Book = require('../models/Book');
const { successResponse, errorResponse, getPaginationData, asyncHandler } = require('../utils/helpers');

/**
 * Get all books with pagination and filtering
 * @route GET /api/books
 * @access Public
 */
const getBooks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { isActive: true };
  
  if (req.query.genre) {
    filter.genre = req.query.genre;
  }
  
  if (req.query.author) {
    filter.author = { $regex: req.query.author, $options: 'i' };
  }
  
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { author: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  if (req.query.available === 'true') {
    filter.availableCopies = { $gt: 0 };
  }

  // Build sort
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
    const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
    sort = { [sortField]: sortOrder };
  }

  // Execute queries
  const [books, total] = await Promise.all([
    Book.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Book.countDocuments(filter)
  ]);

  const pagination = getPaginationData(page, limit, total);

  successResponse(res, {
    books,
    pagination
  }, 'Books retrieved successfully');
});

/**
 * Get book by ID
 * @route GET /api/books/:id
 * @access Public
 */
const getBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const book = await Book.findById(id);
  
  if (!book || !book.isActive) {
    return errorResponse(res, 'Book not found', 404);
  }

  successResponse(res, { book }, 'Book retrieved successfully');
});

/**
 * Add new book (Admin only)
 * @route POST /api/books
 * @access Private/Admin
 */
const addBook = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    isbn,
    publicationDate,
    genre,
    totalCopies,
    description,
    language,
    publisher,
    pages
  } = req.body;

  // Check if book with same ISBN already exists
  const existingBook = await Book.findOne({ isbn });
  if (existingBook) {
    return errorResponse(res, 'Book with this ISBN already exists', 400);
  }

  // Create new book
  const book = await Book.create({
    title,
    author,
    isbn,
    publicationDate,
    genre,
    totalCopies,
    availableCopies: totalCopies, // Initially all copies are available
    description,
    language: language || 'English',
    publisher,
    pages
  });

  successResponse(res, { book }, 'Book added successfully', 201);
});

/**
 * Update book (Admin only)
 * @route PUT /api/books/:id
 * @access Private/Admin
 */
const updateBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    author,
    isbn,
    publicationDate,
    genre,
    totalCopies,
    description,
    language,
    publisher,
    pages
  } = req.body;

  const book = await Book.findById(id);
  if (!book) {
    return errorResponse(res, 'Book not found', 404);
  }

  // Check if ISBN is being changed and if it's already taken
  if (isbn && isbn !== book.isbn) {
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return errorResponse(res, 'Book with this ISBN already exists', 400);
    }
  }

  // Update book fields
  book.title = title || book.title;
  book.author = author || book.author;
  book.isbn = isbn || book.isbn;
  book.publicationDate = publicationDate || book.publicationDate;
  book.genre = genre || book.genre;
  book.description = description || book.description;
  book.language = language || book.language;
  book.publisher = publisher || book.publisher;
  book.pages = pages || book.pages;

  // Handle total copies update
  if (totalCopies !== undefined) {
    const borrowedCopies = book.totalCopies - book.availableCopies;
    
    if (totalCopies < borrowedCopies) {
      return errorResponse(res, 
        `Cannot reduce total copies below ${borrowedCopies} (currently borrowed copies)`, 
        400
      );
    }
    
    book.availableCopies = totalCopies - borrowedCopies;
    book.totalCopies = totalCopies;
  }

  await book.save();

  successResponse(res, { book }, 'Book updated successfully');
});

/**
 * Delete book (Admin only)
 * @route DELETE /api/books/:id
 * @access Private/Admin
 */
const deleteBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const book = await Book.findById(id);
  if (!book) {
    return errorResponse(res, 'Book not found', 404);
  }

  // Check if book has borrowed copies
  if (book.availableCopies < book.totalCopies) {
    return errorResponse(res, 'Cannot delete book with borrowed copies', 400);
  }

  // Soft delete by deactivating the book
  book.isActive = false;
  await book.save();

  successResponse(res, null, 'Book deleted successfully');
});

/**
 * Get book genres
 * @route GET /api/books/genres
 * @access Public
 */
const getGenres = asyncHandler(async (req, res) => {
  const genres = [
    'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
    'Romance', 'Thriller', 'Biography', 'History', 'Science', 'Technology',
    'Philosophy', 'Religion', 'Self-Help', 'Health', 'Travel', 'Cooking',
    'Art', 'Music', 'Sports', 'Politics', 'Economics', 'Education', 'Other'
  ];

  successResponse(res, { genres }, 'Genres retrieved successfully');
});

/**
 * Search books
 * @route GET /api/books/search
 * @access Public
 */
const searchBooks = asyncHandler(async (req, res) => {
  const { q, genre, author, available } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!q) {
    return errorResponse(res, 'Search query is required', 400);
  }

  // Build search filter
  const filter = {
    isActive: true,
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { author: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { isbn: { $regex: q, $options: 'i' } }
    ]
  };

  if (genre) {
    filter.genre = genre;
  }

  if (author) {
    filter.author = { $regex: author, $options: 'i' };
  }

  if (available === 'true') {
    filter.availableCopies = { $gt: 0 };
  }

  // Execute search
  const [books, total] = await Promise.all([
    Book.find(filter)
      .sort({ borrowCount: -1, createdAt: -1 }) // Popular books first
      .skip(skip)
      .limit(limit),
    Book.countDocuments(filter)
  ]);

  const pagination = getPaginationData(page, limit, total);

  successResponse(res, {
    books,
    pagination,
    searchQuery: q
  }, 'Search completed successfully');
});

module.exports = {
  getBooks,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
  getGenres,
  searchBooks
};
