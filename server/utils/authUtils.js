const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key-here', {
    expiresIn: '30d',
  });
};

/**
 * Validates an email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Compare password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if match, false otherwise
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Formats user response object for consistent API responses
 * @param {Object} user - User document
 * @param {Object} profile - User profile document
 * @param {string} token - JWT token (optional)
 * @returns {Object} Formatted user response
 */
const formatUserResponse = (user, profile = null, token = null) => {
  const response = {
    _id: user._id,
    username: user.username,
    email: user.email,
    friends: user.friends || [],
    friendRequests: user.friendRequests || { sent: [], received: [] },
    isAdmin: user.isAdmin,
  };

  if (profile) {
    response.profile = profile;
  }

  if (token) {
    response.token = token;
  }

  return response;
};

module.exports = {
  generateToken,
  isValidEmail,
  comparePassword,
  formatUserResponse
}; 