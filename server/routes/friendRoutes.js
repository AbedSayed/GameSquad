const express = require('express');
const router = express.Router();
const {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected and require authentication
router.use(protect);

// GET /api/friends - Get all friends
router.get('/', getFriends);

// GET /api/friends/requests - Get all friend requests
router.get('/requests', getFriendRequests);

// POST /api/friends/request/:id - Send friend request
router.post('/request/:id', sendFriendRequest);

// POST /api/friends/accept/:requestId - Accept friend request
router.post('/accept/:requestId', acceptFriendRequest);

// POST /api/friends/reject/:requestId - Reject friend request
router.post('/reject/:requestId', rejectFriendRequest);

// DELETE /api/friends/:id - Remove friend
router.delete('/:id', removeFriend);

module.exports = router; 