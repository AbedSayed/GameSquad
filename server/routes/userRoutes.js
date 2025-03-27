const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserStatus,
  getUsers,
  getUserById,
  getMe,
  getAllUsers,
  createTestUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/all', getAllUsers);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getUsers);

// Development route for creating a test user
router.post('/create-test', createTestUser);

// Protected routes
router.get('/me', protect, getMe);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/status', protect, updateUserStatus);

// Parameterized routes (must come last)
router.get('/:id', getUserById);

module.exports = router;
