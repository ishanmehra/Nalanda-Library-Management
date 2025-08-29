# Nalanda Library Management System

A library management system built with Node.js, Express, and MongoDB. The system provides REST API endpoints for managing users, books, and borrowing records.

## Features

### Core Functionality
- User Management: Registration, authentication, role-based access control
- Book Management: Add, update, delete, and search books
- Borrowing System: Borrow, return, and renew books
- Reports: Basic reporting with database queries

### Security Features
- JWT Authentication for secure login
- Role-based Authorization (Admin and Member roles)
- Input Validation using express-validator
- Basic security headers

### API Features
- REST API endpoints for all operations
- Pagination for large datasets
- Search and filtering capabilities
- Error handling

## Tech Stack

- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT
- API: REST endpoints
- Validation: express-validator

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm package manager

## Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd nalanda-library-management
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Environment Configuration
   Create a .env file in the root directory:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nalanda_library
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   ENCRYPTION_KEY=your_encryption_key
   ```

4. Start MongoDB service

5. Run the application
   ```bash
   npm run dev
   ```

## API Documentation

### Base URLs
- REST API: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/health`

### Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### REST API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user

#### Users (Admin only)
- `GET /api/users` - Get all users with pagination
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Books
- `GET /api/books` - Get all books with pagination and filtering
- `GET /api/books/genres` - Get available genres
- `GET /api/books/search` - Search books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Add new book (Admin only)
- `PUT /api/books/:id` - Update book (Admin only)
- `DELETE /api/books/:id` - Delete book (Admin only)

#### Borrowing
- `POST /api/borrow` - Borrow a book
- `GET /api/borrow/history` - Get borrowing history
- `GET /api/borrow/active` - Get active borrows
- `GET /api/borrow/overdue` - Get overdue books (Admin only)
- `GET /api/borrow` - Get all borrow records (Admin only)
- `PUT /api/borrow/:id/return` - Return a book
- `PUT /api/borrow/:id/renew` - Renew a borrowed book

#### Reports (Admin only)
- `GET /api/reports/dashboard` - Get dashboard statistics
- `GET /api/reports/most-borrowed-books` - Most borrowed books report
- `GET /api/reports/active-members` - Most active members report
- `GET /api/reports/book-availability` - Book availability report
- `GET /api/reports/borrowing-trends` - Borrowing trends report

### GraphQL Schema

Access GraphQL playground at `http://localhost:3000/graphql` in development mode.

## Database Schema

### User Schema
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: Enum ['Admin', 'Member'],
  isActive: Boolean,
  lastLogin: Date,
  borrowedBooks: [ObjectId] // References to BorrowRecord
}
```

### Book Schema
```javascript
{
  title: String (required),
  author: String (required),
  isbn: String (required, unique),
  publicationDate: Date (required),
  genre: Enum [predefined genres],
  totalCopies: Number (required),
  availableCopies: Number (required),
  description: String,
  language: String,
  publisher: String,
  pages: Number,
  rating: Number,
  borrowCount: Number,
  isActive: Boolean
}
```

### BorrowRecord Schema
```javascript
{
  user: ObjectId (required), // Reference to User
  book: ObjectId (required), // Reference to Book
  borrowDate: Date (required),
  dueDate: Date (required),
  returnDate: Date,
  status: Enum ['Borrowed', 'Returned', 'Overdue', 'Lost'],
  notes: String,
  renewalCount: Number,
  fine: {
    amount: Number,
    paid: Boolean,
    paidDate: Date
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/nalanda_library |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `ENCRYPTION_KEY` | Encryption key for JWT | Required |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Default Admin User

You can create an admin user by registering with role "Admin" or by directly inserting into the database:

```javascript
{
  name: "Admin User",
  email: "admin@nalanda.com",
  password: "hashedPassword",
  role: "Admin"
}
```

## 📊 Features in Detail

### User Management
- **Registration**: Users can register as Members
- **Authentication**: Secure JWT-based authentication
- **Authorization**: Role-based access control
- **Profile Management**: Users can update their profiles

### Book Management
- **CRUD Operations**: Complete book management
- **Search & Filter**: Search by title, author, genre
- **Availability Tracking**: Real-time copy availability
- **Metadata**: Rich book information

### Borrowing System
- **Borrow Limits**: Maximum 5 books per user
- **Due Dates**: Automatic due date calculation (14 days)
- **Renewals**: Up to 3 renewals per book
- **Overdue Tracking**: Automatic overdue detection
- **Fine Calculation**: Automatic fine calculation

### Reports & Analytics
- **Most Borrowed Books**: Track popular books
- **Active Members**: Identify engaged users
- **Availability Reports**: Inventory management
- **Trends Analysis**: Borrowing patterns over time

## Testing

### API Testing

You can test the API using Postman or any REST client.

**Postman Collection**: [Nalanda Library API Testing](https://water7.postman.co/workspace/water~6e4dfe61-2e3d-43a2-bed2-fd109906ebd7/request/39976883-8453dc6a-eb25-4c44-bd57-04d212927650?action=share&creator=39976883&ctx=documentation)

Test Credentials:
- Admin: `admin@nalanda.com` / `Admin123!`
- Member: `john.smith@email.com` / `Password123!`

Testing Steps:
1. Start the server: `npm run dev`
2. Test the health endpoint: GET `/health`
3. Login to get JWT token
4. Use token in Authorization header for protected routes

### Unit Tests

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Deployment

For production deployment:

1. Set environment variables properly
2. Use a production MongoDB instance
3. Change JWT secrets to secure values
4. Enable HTTPS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

---

Built for efficient library management.
