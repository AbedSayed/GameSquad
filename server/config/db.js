const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @returns {Promise<boolean>} True if connection succeeded
 */
const connectDB = async () => {
  try {
    // Check if MongoDB URI is set
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      throw new Error('Database connection string is missing');
    }

    console.log('Connecting to MongoDB...');
    
    // Connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-indexing in production for performance
      maxPoolSize: 10, // Maximum connection pool size
      minPoolSize: 2, // Minimum connection pool size
      connectTimeoutMS: 10000, // Connection timeout
      retryWrites: true, // Retry write operations
      retryReads: true, // Retry read operations
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    // Log connection details in non-production environments only
    if (process.env.NODE_ENV !== 'production') {
      console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
      console.log(`Database: ${conn.connection.name}`);
    } else {
      console.log('MongoDB connected successfully');
    }
    
    return true;
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    
    // Only log full error details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Full error details:', error);
    }
    
    // Don't exit the process here - let the caller handle it
    throw error;
  }
};

// Set up connection event handlers
const setupMongooseEvents = () => {
  // Handle connection errors after initial connection
  mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    // Don't automatically reconnect - let the app handle this
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });

  // For graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to application termination');
      process.exit(0);
    } catch (err) {
      console.error('Error during MongoDB shutdown:', err);
      process.exit(1);
    }
  });
};

// Setup event handlers
setupMongooseEvents();

module.exports = { connectDB };
