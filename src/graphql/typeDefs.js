const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    isActive: Boolean!
    lastLogin: Date
    createdAt: Date!
    updatedAt: Date!
    borrowedBooks: [BorrowRecord!]
  }

  type Book {
    id: ID!
    title: String!
    author: String!
    isbn: String!
    publicationDate: Date!
    genre: Genre!
    totalCopies: Int!
    availableCopies: Int!
    borrowedCopies: Int!
    description: String
    language: String
    publisher: String
    pages: Int
    rating: Float
    borrowCount: Int!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  type BorrowRecord {
    id: ID!
    user: User!
    book: Book!
    borrowDate: Date!
    dueDate: Date!
    returnDate: Date
    status: BorrowStatus!
    notes: String
    renewalCount: Int!
    fine: Fine!
    isOverdue: Boolean!
    daysBorrowed: Int!
    daysOverdue: Int!
    createdAt: Date!
    updatedAt: Date!
  }

  type Fine {
    amount: Float!
    paid: Boolean!
    paidDate: Date
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type BookAvailabilityReport {
    totalBooks: Int!
    totalCopies: Int!
    availableCopies: Int!
    borrowedCopies: Int!
    booksWithNoCopies: Int!
    availabilityPercentage: Float!
  }

  type GenreBreakdown {
    genre: String!
    totalBooks: Int!
    totalCopies: Int!
    availableCopies: Int!
    borrowedCopies: Int!
    availabilityPercentage: Float!
  }

  type MostBorrowedBook {
    book: Book!
    borrowCount: Int!
    uniqueBorrowers: Int!
    lastBorrowed: Date!
  }

  type ActiveMember {
    user: User!
    totalBorrows: Int!
    uniqueBooks: Int!
    lastBorrow: Date!
    returnedBooks: Int!
    overdueBooks: Int!
  }

  type PaginationInfo {
    currentPage: Int!
    totalPages: Int!
    totalItems: Int!
    itemsPerPage: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
    nextPage: Int
    prevPage: Int
  }

  type BooksResult {
    books: [Book!]!
    pagination: PaginationInfo!
  }

  type UsersResult {
    users: [User!]!
    pagination: PaginationInfo!
  }

  type BorrowRecordsResult {
    borrowRecords: [BorrowRecord!]!
    pagination: PaginationInfo!
  }

  enum Role {
    Admin
    Member
  }

  enum Genre {
    Fiction
    NonFiction
    ScienceFiction
    Fantasy
    Mystery
    Romance
    Thriller
    Biography
    History
    Science
    Technology
    Philosophy
    Religion
    SelfHelp
    Health
    Travel
    Cooking
    Art
    Music
    Sports
    Politics
    Economics
    Education
    Other
  }

  enum BorrowStatus {
    Borrowed
    Returned
    Overdue
    Lost
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
    role: Role
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input BookInput {
    title: String!
    author: String!
    isbn: String!
    publicationDate: Date!
    genre: Genre!
    totalCopies: Int!
    description: String
    language: String
    publisher: String
    pages: Int
  }

  input BookUpdateInput {
    title: String
    author: String
    isbn: String
    publicationDate: Date
    genre: Genre
    totalCopies: Int
    description: String
    language: String
    publisher: String
    pages: Int
  }

  input UserUpdateInput {
    name: String
    email: String
    role: Role
    isActive: Boolean
  }

  input BorrowBookInput {
    bookId: ID!
    dueDate: Date
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 10
  }

  input BookFilterInput {
    genre: Genre
    author: String
    search: String
    available: Boolean
  }

  input UserFilterInput {
    role: Role
    isActive: Boolean
    search: String
  }

  input BorrowFilterInput {
    status: BorrowStatus
    userId: ID
    bookId: ID
  }

  type Query {
    # User queries
    me: User!
    users(pagination: PaginationInput, filter: UserFilterInput, sort: String): UsersResult!
    user(id: ID!): User!
    
    # Book queries
    books(pagination: PaginationInput, filter: BookFilterInput, sort: String): BooksResult!
    book(id: ID!): Book!
    genres: [String!]!
    searchBooks(query: String!, pagination: PaginationInput, filter: BookFilterInput): BooksResult!
    
    # Borrow queries
    borrowHistory(pagination: PaginationInput, filter: BorrowFilterInput): BorrowRecordsResult!
    activeBorrows: [BorrowRecord!]!
    allBorrowRecords(pagination: PaginationInput, filter: BorrowFilterInput, sort: String): BorrowRecordsResult!
    overdueBooks(pagination: PaginationInput): BorrowRecordsResult!
    
    # Report queries
    mostBorrowedBooks(limit: Int, startDate: Date, endDate: Date): [MostBorrowedBook!]!
    activeMembers(limit: Int, startDate: Date, endDate: Date): [ActiveMember!]!
    bookAvailabilityReport(genre: Genre, author: String): BookAvailabilityReport!
  }

  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    updateProfile(input: UserUpdateInput!): User!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    
    # User mutations (Admin only)
    createUser(input: RegisterInput!): User!
    updateUser(id: ID!, input: UserUpdateInput!): User!
    deleteUser(id: ID!): Boolean!
    
    # Book mutations (Admin only)
    addBook(input: BookInput!): Book!
    updateBook(id: ID!, input: BookUpdateInput!): Book!
    deleteBook(id: ID!): Boolean!
    
    # Borrow mutations
    borrowBook(input: BorrowBookInput!): BorrowRecord!
    returnBook(id: ID!): BorrowRecord!
    renewBook(id: ID!): BorrowRecord!
  }
`;

module.exports = typeDefs;
