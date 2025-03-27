const mongoose = require('mongoose');

// Debug: Log database configuration (without password)
console.log('MongoDB Configuration:', {
  url: process.env.MONGODB_URI ? 'Connected' : 'Not Connected'
});

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`MongoDB Atlas Connected Successfully!`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Port: ${conn.connection.port}`);
    return true;
  } catch (error) {
    console.error('MongoDB Atlas Connection Error:', error.message);
    console.error('Full error details:', error);
    process.exit(1);
  }
};

// Handle connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

module.exports = { connectDB };
