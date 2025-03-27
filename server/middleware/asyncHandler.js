/**
 * Custom async handler to avoid try-catch blocks in route handlers
 * @param {Function} fn - Async function to handle the route
 * @returns {Function} - Express middleware function with error handling
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
