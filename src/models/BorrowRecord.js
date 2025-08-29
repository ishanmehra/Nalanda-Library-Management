const mongoose = require('mongoose');

const borrowRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book is required']
  },
  borrowDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.borrowDate;
      },
      message: 'Due date must be after borrow date'
    }
  },
  returnDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= this.borrowDate;
      },
      message: 'Return date cannot be before borrow date'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['Borrowed', 'Returned', 'Overdue', 'Lost'],
      message: 'Status must be one of: Borrowed, Returned, Overdue, Lost'
    },
    default: 'Borrowed'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  renewalCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 3 // Maximum 3 renewals allowed
  },
  fine: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
borrowRecordSchema.index({ user: 1, status: 1 });
borrowRecordSchema.index({ book: 1, status: 1 });
borrowRecordSchema.index({ borrowDate: -1 });
borrowRecordSchema.index({ dueDate: 1 });
borrowRecordSchema.index({ status: 1 });

// Virtual for calculating if the book is overdue
borrowRecordSchema.virtual('isOverdue').get(function() {
  if (this.status === 'Returned' || this.status === 'Lost') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual for days borrowed (for active loans)
borrowRecordSchema.virtual('daysBorrowed').get(function() {
  const endDate = this.returnDate || new Date();
  const diffTime = Math.abs(endDate - this.borrowDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days overdue
borrowRecordSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'Returned' || this.status === 'Lost' || !this.isOverdue) {
    return 0;
  }
  const diffTime = Math.abs(new Date() - this.dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to calculate fine (assuming $1 per day overdue)
borrowRecordSchema.methods.calculateFine = function() {
  const daysOverdue = this.daysOverdue;
  return daysOverdue * 1; // $1 per day
};

// Method to return the book
borrowRecordSchema.methods.returnBook = function() {
  this.returnDate = new Date();
  this.status = 'Returned';
  
  // Calculate fine if overdue
  if (this.isOverdue) {
    this.fine.amount = this.calculateFine();
  }
};

// Method to renew the book (extend due date by 14 days)
borrowRecordSchema.methods.renewBook = function() {
  if (this.renewalCount >= 3) {
    throw new Error('Maximum renewal limit reached');
  }
  
  this.dueDate = new Date(this.dueDate.getTime() + (14 * 24 * 60 * 60 * 1000));
  this.renewalCount += 1;
};

// Pre-save middleware to update status based on due date
borrowRecordSchema.pre('save', function(next) {
  if (this.status === 'Borrowed' && this.isOverdue) {
    this.status = 'Overdue';
  }
  next();
});

// Transform output to include virtual fields
borrowRecordSchema.set('toJSON', { virtuals: true });
borrowRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BorrowRecord', borrowRecordSchema);
