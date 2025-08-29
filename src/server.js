require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import utilities and middleware
const connectDB = require('./utils/database');
const { errorHandler, notFound } = require('./middleware/error');
const { authenticateToken } = require('./middleware/auth');
const JWTUtils = require('./utils/jwt');
const User = require('./models/User');

// Import GraphQL schema
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const borrowRoutes = require('./routes/borrow');
const reportRoutes = require('./routes/reports');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Nalanda Library Management System is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/reports', reportRoutes);

// GraphQL context function
const getUser = async (req) => {
  let token = null;
  
  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return null;
  }

  try {
    const decoded = JWTUtils.verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    return user && user.isActive ? user : null;
  } catch (error) {
    return null;
  }
};

// GraphQL server setup
async function startApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const user = await getUser(req);
      return { user };
    },
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      
      // Return user-friendly error messages
      return {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
        timestamp: new Date().toISOString()
      };
    }
  });

  await server.start();
  server.applyMiddleware({ 
    app, 
    path: '/graphql',
    cors: false // We're handling CORS at the app level
  });
  
  console.log(`GraphQL Server ready at http://localhost:${PORT}${server.graphqlPath}`);
}

// Initialize Apollo Server
startApolloServer().catch(error => {
  console.error('Error starting Apollo Server:', error);
  process.exit(1);
});

// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
