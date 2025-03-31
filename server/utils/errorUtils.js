/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Creates a 400 Bad Request error
 * @param {string} message - Error message
 * @param {Array} errors - Additional error details
 * @returns {ApiError} Bad request error
 */
const badRequest = (message = 'Bad Request', errors = []) => {
  return new ApiError(message, 400, errors);
};

/**
 * Creates a 401 Unauthorized error
 * @param {string} message - Error message
 * @returns {ApiError} Unauthorized error
 */
const unauthorized = (message = 'Unauthorized') => {
  return new ApiError(message, 401);
};

/**
 * Creates a 403 Forbidden error
 * @param {string} message - Error message
 * @returns {ApiError} Forbidden error
 */
const forbidden = (message = 'Forbidden') => {
  return new ApiError(message, 403);
};

/**
 * Creates a 404 Not Found error
 * @param {string} message - Error message
 * @returns {ApiError} Not Found error
 */
const notFound = (message = 'Resource not found') => {
  return new ApiError(message, 404);
};

/**
 * Creates a 500 Internal Server error
 * @param {string} message - Error message
 * @returns {ApiError} Server error
 */
const serverError = (message = 'Internal Server Error') => {
  return new ApiError(message, 500);
};

/**
 * Formats error response for consistent API responses
 * @param {Error} err - Error object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (err) => {
  const response = {
    success: false,
    message: err.message || 'An error occurred'
  };

  // Add detailed errors if available
  if (err.errors && err.errors.length > 0) {
    response.errors = err.errors;
  }

  return response;
};

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  formatErrorResponse
}; 