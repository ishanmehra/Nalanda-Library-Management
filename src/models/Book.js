const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
    match: [/^(?:ISBN(?:-1[03])?:?\s)?(?=[-0-9\s]{17}$|[-0-9X\s]{13}$|[0-9X]{10}$)(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?(?:[0-9]+[-\s]?){2}[0-9X]$/, 'Please enter a valid ISBN']
  },
  publicationDate: {
    type: Date,
    required: [true, 'Publication date is required']
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    trim: true,
    enum: {
      values: [
        'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 
        'Romance', 'Thriller', 'Biography', 'History', 'Science', 'Technology',
        'Philosophy', 'Religion', 'Self-Help', 'Health', 'Travel', 'Cooking',
        'Art', 'Music', 'Sports', 'Politics', 'Economics', 'Education', 'Other'
      ],
      message: 'Genre must be from the predefined list'
    }
  },
  totalCopies: {
    type: Number,
    required: [true, 'Total copies is required'],
    min: [1, 'Total copies must be at least 1']
  },
  availableCopies: {
    type: Number,
    required: true,
    min: [0, 'Available copies cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.totalCopies;
      },
      message: 'Available copies cannot exceed total copies'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher name cannot exceed 100 characters']
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1']
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  borrowCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookSchema.index({ title: 'text', author: 'text', description: 'text' });
bookSchema.index({ genre: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ borrowCount: -1 });
bookSchema.index({ createdAt: -1 });

// Virtual for borrowed copies
bookSchema.virtual('borrowedCopies').get(function() {
  return this.totalCopies - this.availableCopies;
});

// Method to check if book is available
bookSchema.methods.isAvailable = function() {
  return this.availableCopies > 0 && this.isActive;
};

// Method to borrow a copy
bookSchema.methods.borrowCopy = function() {
  if (this.availableCopies > 0) {
    this.availableCopies -= 1;
    this.borrowCount += 1;
    return true;
  }
  return false;
};

// Method to return a copy
bookSchema.methods.returnCopy = function() {
  if (this.availableCopies < this.totalCopies) {
    this.availableCopies += 1;
    return true;
  }
  return false;
};

// Transform output to include virtual fields
bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);
