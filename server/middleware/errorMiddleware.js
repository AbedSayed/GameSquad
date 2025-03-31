const { formatErrorResponse, ApiError } = require('../utils/errorUtils');

/**
 * Not found middleware - handles requests to non-existent routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('ERROR:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Determine status code (use 500 as default)
  const statusCode = err instanceof ApiError 
    ? err.statusCode 
    : res.statusCode === 200 ? 500 : res.statusCode;

  // Format the error response
  const errorResponse = formatErrorResponse(err);

  // Send the response
  res.status(statusCode).json(errorResponse);
};

module.exports = { notFound, errorHandler };
