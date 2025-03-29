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
  inviteToLobby,
  getUserLobbies
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const { User } = require('../models');

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
router.post('/friends/add', protect, async (req, res) => {
  try {
    const { friendId, username } = req.body;
    const userId = req.user.id;
    
    if (!friendId) {
      return res.status(400).json({ success: false, message: 'Friend ID is required' });
    }
    
    // Check if users exist
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!friend) {
      return res.status(404).json({ success: false, message: 'Friend not found' });
    }
    
    // Check if they're already friends
    if (user.friends && user.friends.some(f => f.toString() === friendId)) {
      return res.status(400).json({ success: false, message: 'Already friends with this user' });
    }
    
    // Initialize friends array if it doesn't exist
    if (!user.friends) {
      user.friends = [];
    }
    
    if (!friend.friends) {
      friend.friends = [];
    }
    
    // Add each other as friends
    user.friends.push(friendId);
    friend.friends.push(userId);
    
    await user.save();
    await friend.save();
    
    res.status(200).json({
      success: true,
      message: 'Friend added successfully',
      friend: {
        _id: friend._id,
        username: friend.username
      }
    });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error adding friend',
      error: error.message
    });
  }
});

// Make sure the friend request route exists and is working properly
router.post('/friends/request/:userId', protect, async (req, res) => {
  try {
    const senderId = req.user.id;
    const recipientId = req.params.userId;
    const { message } = req.body;
    
    console.log(`Processing friend request from ${senderId} to ${recipientId}`);
    
    // Check if users exist
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);
    
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found' });
    }
    
    if (senderId === recipientId) {
      return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
    }
    
    // Check if they're already friends
    if (sender.friends && sender.friends.includes(recipientId)) {
      return res.status(400).json({ success: false, message: 'You are already friends with this user' });
    }
    
    // Ensure friendRequests structure exists
    if (!sender.friendRequests) {
      sender.friendRequests = { sent: [], received: [] };
    }
    
    if (!recipient.friendRequests) {
      recipient.friendRequests = { sent: [], received: [] };
    }
    
    // Check if there's already a pending request
    const existingSentRequest = sender.friendRequests.sent.find(
      request => request.recipient && request.recipient.toString() === recipientId
    );
    
    if (existingSentRequest) {
      return res.status(400).json({ success: false, message: 'You have already sent a friend request to this user' });
    }
    
    // Also check if recipient has already sent a request to the sender
    const existingReceivedRequest = sender.friendRequests.received.find(
      request => request.sender && request.sender.toString() === recipientId
    );
    
    if (existingReceivedRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'This user has already sent you a friend request. Check your friend requests to accept it.' 
      });
    }
    
    // Create a unique request ID
    const newRequestId = new mongoose.Types.ObjectId();
    
    // Add to sender's sent requests
    sender.friendRequests.sent.push({
      _id: newRequestId,
      recipient: recipientId,
      status: 'pending',
      message: message || `${sender.username} would like to be your friend!`,
      createdAt: new Date()
    });
    
    // Add to recipient's received requests
    recipient.friendRequests.received.push({
      _id: newRequestId,
      sender: senderId,
      status: 'pending',
      message: message || `${sender.username} would like to be your friend!`,
      createdAt: new Date()
    });
    
    await sender.save();
    await recipient.save();
    
    console.log(`Friend request from ${sender.username} to ${recipient.username} created successfully`);
    
    // Return updated user info for localStorage
    const userInfo = {
      _id: sender._id,
      username: sender.username,
      email: sender.email,
      friends: sender.friends || [],
      friendRequests: sender.friendRequests || { sent: [], received: [] }
    };
    
    res.status(200).json({ 
      success: true,
      message: 'Friend request sent successfully', 
      userInfo,
      requestId: newRequestId // Return the request ID
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending friend request',
      error: error.message
    });
  }
});

// Sync a friend request that was received via socket
router.post('/friends/sync-request', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { request } = req.body;
    
    if (!request || !request.sender || !request._id) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }
    
    console.log(`Syncing friend request to user ${userId} from ${request.sender}`);
    
    // Get recipient (current user)
    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get sender
    const sender = await User.findById(request.sender);
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }
    
    // Check if they're already friends
    if (recipient.friends && recipient.friends.includes(request.sender)) {
      return res.status(400).json({ success: false, message: 'Already friends with this user' });
    }
    
    // Ensure friendRequests structure exists
    if (!recipient.friendRequests) {
      recipient.friendRequests = { sent: [], received: [] };
    }
    
    // Check if request already exists
    const existingRequest = recipient.friendRequests.received.find(
      req => (req._id.toString() === request._id) || 
            (req.sender && req.sender.toString() === request.sender)
    );
    
    if (existingRequest) {
      console.log('Friend request already exists in database, skipping duplicate');
      return res.status(200).json({ 
        success: true, 
        message: 'Friend request already exists',
        exists: true
      });
    }
    
    // Add to recipient's received requests
    recipient.friendRequests.received.push({
      _id: request._id,
      sender: request.sender,
      status: 'pending',
      message: request.message || `${sender.username} would like to be your friend!`,
      createdAt: request.createdAt || new Date()
    });
    
    // Check if sender has sent requests and if request is in there
    if (!sender.friendRequests) {
      sender.friendRequests = { sent: [], received: [] };
    }
    
    if (!sender.friendRequests.sent) {
      sender.friendRequests.sent = [];
    }
    
    const existingSentRequest = sender.friendRequests.sent.find(
      req => (req._id.toString() === request._id) || 
            (req.recipient && req.recipient.toString() === userId)
    );
    
    // Add to sender's sent requests if not already there
    if (!existingSentRequest) {
      sender.friendRequests.sent.push({
        _id: request._id,
        recipient: userId,
        status: 'pending',
        message: request.message || `${sender.username} would like to be your friend!`,
        createdAt: request.createdAt || new Date()
      });
    }
    
    // Save both users
    await recipient.save();
    await sender.save();
    
    console.log(`Friend request synced successfully between ${sender.username} and ${recipient.username}`);
    
    // Return updated user info
    const userInfo = {
      _id: recipient._id,
      username: recipient.username,
      email: recipient.email,
      friends: recipient.friends || [],
      friendRequests: recipient.friendRequests || { sent: [], received: [] }
    };
    
    res.status(200).json({
      success: true,
      message: 'Friend request synced successfully',
      userInfo
    });
  } catch (error) {
    console.error('Error syncing friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing friend request',
      error: error.message
    });
  }
});

// Get all friend requests for the current user
router.get('/friends/requests', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with populated friend requests
    const user = await User.findById(userId)
      .populate('friendRequests.received.sender', 'username profile')
      .populate('friendRequests.sent.recipient', 'username profile');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const friendRequests = user.friendRequests || { sent: [], received: [] };
    
    res.status(200).json({
      success: true,
      data: friendRequests
    });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting friend requests',
      error: error.message
    });
  }
});

// Accept a friend request
router.post('/friends/accept/:requestId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    console.log(`Processing friend request acceptance: ${requestId} by user ${userId}`);
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Find the friend request
    if (!user.friendRequests) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    
    const requestIndex = user.friendRequests.received.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    
    const request = user.friendRequests.received[requestIndex];
    const senderId = request.sender;
    
    // Find the sender
    const sender = await User.findById(senderId);
    
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
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
    
    console.log(`Friend request accepted: ${user.username} and ${sender.username} are now friends`);
    
    // Update localStorage data
    const userInfo = {
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends,
      friendRequests: user.friendRequests
    };
    
    res.status(200).json({ 
      success: true,
      message: 'Friend request accepted', 
      userInfo 
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error accepting friend request',
      error: error.message
    });
  }
});

// Reject a friend request
router.post('/friends/reject/:requestId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Find the friend request
    if (!user.friendRequests) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    
    const requestIndex = user.friendRequests.received.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
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
    
    res.status(200).json({ 
      success: true,
      message: 'Friend request rejected' 
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error rejecting friend request',
      error: error.message
    });
  }
});

// Cancel a sent friend request
router.post('/friends/cancel/:requestId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Find the friend request
    if (!user.friendRequests) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    
    const requestIndex = user.friendRequests.sent.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
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
    
    res.status(200).json({ 
      success: true,
      message: 'Friend request cancelled' 
    });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error cancelling friend request',
      error: error.message
    });
  }
});

// Remove an existing friend
router.post('/friends/remove/:friendId', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;
    
    // Find both users
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!friend) {
      return res.status(404).json({ success: false, message: 'Friend not found' });
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
      success: true,
      message: 'Friend removed successfully', 
      userInfo 
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error removing friend',
      error: error.message
    });
  }
});

router.get('/friends', protect, getFriends);
router.delete('/friends/:id', protect, removeFriend);

// Lobby invitation route
router.post('/invite/:userId/lobby/:lobbyId', protect, inviteToLobby);

// Get user's lobbies (both hosting and joined)
router.get('/lobbies', protect, getUserLobbies);

// Token validation endpoint
router.get('/validate-token', protect, (req, res) => {
  // If middleware passes, token is valid
  res.status(200).json({ 
    valid: true, 
    message: 'Token is valid',
    user: { id: req.user._id, username: req.user.username }
  });
});

// Parameterized routes (must come last)
router.get('/:id', getUserById);

module.exports = router;
