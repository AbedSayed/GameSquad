// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Get status code from response or default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error for debugging with more details
  console.error('=== SERVER ERROR ===');
  console.error(`Message: ${err.message}`);
  console.error(`Status: ${statusCode}`);
  console.error(`Path: ${req.originalUrl}`);
  console.error(`Method: ${req.method}`);
  console.error(`Stack: ${err.stack}`);
  
  // Send response with standardized format
  res.status(statusCode).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

// Middleware for handling 404 Not Found errors
const notFound = (req, res, next) => {
  const error = new Error(`API endpoint not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };
