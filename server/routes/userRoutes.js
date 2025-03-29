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
  addFriend,
  getFriends,
  removeFriend,
  inviteToLobby
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const User = require('../models/userModel');

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

// Friends routes
router.post('/friends/add/:id', protect, addFriend);
router.get('/friends', protect, getFriends);
router.delete('/friends/:id', protect, removeFriend);

// Lobby invitation route
router.post('/invite/:userId/lobby/:lobbyId', protect, inviteToLobby);

// Token validation endpoint
router.get('/validate-token', protect, (req, res) => {
  // If middleware passes, token is valid
  res.status(200).json({ 
    valid: true, 
    message: 'Token is valid',
    user: { id: req.user._id, username: req.user.username }
  });
});

// Friend Request endpoints
router.post('/friends/request/:userId', protect, async (req, res) => {
  try {
    const senderId = req.user.id;
    const recipientId = req.params.userId;
    
    // Check if users exist
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);
    
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }
    
    if (senderId === recipientId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }
    
    // Check if they're already friends
    if (sender.friends && sender.friends.includes(recipientId)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }
    
    // Check if there's already a pending request
    if (!sender.friendRequests) {
      sender.friendRequests = { sent: [], received: [] };
    }
    
    if (!recipient.friendRequests) {
      recipient.friendRequests = { sent: [], received: [] };
    }
    
    const existingSentRequest = sender.friendRequests.sent.find(
      request => request.recipient.toString() === recipientId
    );
    
    if (existingSentRequest) {
      return res.status(400).json({ message: 'You have already sent a friend request to this user' });
    }
    
    const existingReceivedRequest = sender.friendRequests.received.find(
      request => request.sender.toString() === recipientId
    );
    
    if (existingReceivedRequest) {
      return res.status(400).json({ message: 'This user has already sent you a friend request. Check your friend requests to accept it.' });
    }
    
    // Create the friend request
    const newRequestId = new mongoose.Types.ObjectId();
    
    // Add to sender's sent requests
    sender.friendRequests.sent.push({
      _id: newRequestId,
      recipient: recipientId,
      status: 'pending',
      createdAt: new Date()
    });
    
    // Add to recipient's received requests
    recipient.friendRequests.received.push({
      _id: newRequestId,
      sender: senderId,
      status: 'pending',
      createdAt: new Date()
    });
    
    await sender.save();
    await recipient.save();
    
    // Update localStorage data for the sender
    const userInfo = {
      _id: sender._id,
      username: sender.username,
      email: sender.email,
      friends: sender.friends || [],
      friendRequests: sender.friendRequests || { sent: [], received: [] }
    };
    
    res.status(200).json({ 
      message: 'Friend request sent successfully', 
      userInfo 
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Error sending friend request' });
  }
});

router.get('/friends/requests', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with populated friend requests
    const user = await User.findById(userId)
      .populate('friendRequests.received.sender', 'username profile')
      .populate('friendRequests.sent.recipient', 'username profile');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const friendRequests = user.friendRequests || { sent: [], received: [] };
    
    res.status(200).json(friendRequests);
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ message: 'Error getting friend requests' });
  }
});

router.post('/friends/accept/:requestId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the friend request
    if (!user.friendRequests) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    const requestIndex = user.friendRequests.received.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    const request = user.friendRequests.received[requestIndex];
    const senderId = request.sender;
    
    // Find the sender
    const sender = await User.findById(senderId);
    
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }
    
    // Add each user to the other's friends list
    if (!user.friends) {
      user.friends = [];
    }
    
    if (!sender.friends) {
      sender.friends = [];
    }
    
    // Add friend to each other's lists if not already there
    if (!user.friends.includes(senderId)) {
      user.friends.push(senderId);
    }
    
    if (!sender.friends.includes(userId)) {
      sender.friends.push(userId);
    }
    
    // Remove the request from both users
    user.friendRequests.received.splice(requestIndex, 1);
    
    const senderRequestIndex = sender.friendRequests.sent.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (senderRequestIndex !== -1) {
      sender.friendRequests.sent.splice(senderRequestIndex, 1);
    }
    
    // Save both users
    await user.save();
    await sender.save();
    
    // Update localStorage data
    const userInfo = {
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends,
      friendRequests: user.friendRequests
    };
    
    res.status(200).json({ 
      message: 'Friend request accepted', 
      userInfo 
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request' });
  }
});

router.post('/friends/reject/:requestId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the friend request
    if (!user.friendRequests) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    const requestIndex = user.friendRequests.received.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    const request = user.friendRequests.received[requestIndex];
    const senderId = request.sender;
    
    // Find the sender
    const sender = await User.findById(senderId);
    
    // Remove the request from the user
    user.friendRequests.received.splice(requestIndex, 1);
    await user.save();
    
    // Remove from sender if they exist
    if (sender) {
      const senderRequestIndex = sender.friendRequests.sent.findIndex(
        request => request._id.toString() === requestId
      );
      
      if (senderRequestIndex !== -1) {
        sender.friendRequests.sent.splice(senderRequestIndex, 1);
        await sender.save();
      }
    }
    
    res.status(200).json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ message: 'Error rejecting friend request' });
  }
});

router.post('/friends/cancel/:requestId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the friend request
    if (!user.friendRequests) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    const requestIndex = user.friendRequests.sent.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    const request = user.friendRequests.sent[requestIndex];
    const recipientId = request.recipient;
    
    // Find the recipient
    const recipient = await User.findById(recipientId);
    
    // Remove the request from the user
    user.friendRequests.sent.splice(requestIndex, 1);
    await user.save();
    
    // Remove from recipient if they exist
    if (recipient) {
      const recipientRequestIndex = recipient.friendRequests.received.findIndex(
        request => request._id.toString() === requestId
      );
      
      if (recipientRequestIndex !== -1) {
        recipient.friendRequests.received.splice(recipientRequestIndex, 1);
        await recipient.save();
      }
    }
    
    res.status(200).json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ message: 'Error cancelling friend request' });
  }
});

router.post('/friends/remove/:friendId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;
    
    // Find both users
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }
    
    // Remove from user's friends list
    if (user.friends) {
      user.friends = user.friends.filter(id => id.toString() !== friendId);
    }
    
    // Remove from friend's friends list
    if (friend.friends) {
      friend.friends = friend.friends.filter(id => id.toString() !== userId);
    }
    
    await user.save();
    await friend.save();
    
    // Update localStorage data
    const userInfo = {
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends || [],
      friendRequests: user.friendRequests || { sent: [], received: [] }
    };
    
    res.status(200).json({ 
      message: 'Friend removed successfully', 
      userInfo 
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Error removing friend' });
  }
});

// Parameterized routes (must come last)
router.get('/:id', getUserById);

module.exports = router;
