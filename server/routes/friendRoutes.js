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
const mongoose = require('mongoose');
const { User } = require('../models');

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

// Sync friend request route - handles client-server synchronization of friend requests
router.post('/sync-request', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId, senderId, senderName, message } = req.body;
    
    console.log('Syncing friend request:', { requestId, senderId, senderName });
    
    if (!senderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing sender ID in request body' 
      });
    }
    
    // Find both users
    const user = await User.findById(userId);
    const sender = await User.findById(senderId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize friend requests if needed
    if (!user.friendRequests) {
      user.friendRequests = { sent: [], received: [] };
    }
    if (!user.friendRequests.received) {
      user.friendRequests.received = [];
    }
    
    // Check if a request from this sender already exists
    const existingRequestIndex = user.friendRequests.received.findIndex(req => {
      const reqSenderId = req.sender && typeof req.sender === 'object' 
        ? req.sender.toString() 
        : req.sender;
      return reqSenderId === senderId;
    });
    
    if (existingRequestIndex !== -1) {
      console.log('Friend request already exists in database, updating');
      
      // Update existing request
      const existingRequest = user.friendRequests.received[existingRequestIndex];
      if (requestId) existingRequest.requestId = requestId;
      if (message) existingRequest.message = message;
      if (senderName && existingRequest.senderName === 'Unknown User') {
        existingRequest.senderName = senderName;
      }
      
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: 'Friend request synchronized (updated)',
        userInfo: {
          _id: user._id,
          username: user.username,
          email: user.email,
          friends: user.friends || [],
          friendRequests: user.friendRequests
        }
      });
    }
    
    // If sender exists, create a valid request
    if (sender) {
      console.log(`Sender found: ${sender.username}, creating friend request`);
      
      // Check if they're already friends
      const alreadyFriends = user.friends && user.friends.some(
        friendId => friendId.toString() === senderId
      );
      
      if (alreadyFriends) {
        return res.status(200).json({
          success: false,
          message: 'Users are already friends',
          userInfo: {
            _id: user._id,
            username: user.username,
            email: user.email,
            friends: user.friends || [],
            friendRequests: user.friendRequests
          }
        });
      }
      
      // Create new request
      const newRequest = {
        _id: new mongoose.Types.ObjectId(),
        requestId: requestId || `req_${Date.now()}`,
        sender: senderId,
        senderName: sender.username,
        message: message || `${sender.username} would like to be your friend!`,
        createdAt: new Date()
      };
      
      user.friendRequests.received.push(newRequest);
      
      // Also add to sender's sent requests if they exist
      if (sender.friendRequests && sender.friendRequests.sent) {
        // Check if the request already exists in sender's sent
        const senderHasSent = sender.friendRequests.sent.some(req => {
          const reqRecipientId = req.recipient && typeof req.recipient === 'object' 
            ? req.recipient.toString() 
            : req.recipient;
          return reqRecipientId === userId;
        });
        
        if (!senderHasSent) {
          sender.friendRequests.sent.push({
            _id: newRequest._id,
            recipient: userId,
            message: newRequest.message,
            createdAt: newRequest.createdAt
          });
          await sender.save();
        }
      }
      
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: 'Friend request synchronized (created)',
        userInfo: {
          _id: user._id,
          username: user.username,
          email: user.email,
          friends: user.friends || [],
          friendRequests: user.friendRequests
        }
      });
    } 
    // If sender doesn't exist but we have sender info
    else if (senderId && senderName) {
      console.log('Sender not found in database, but have sender info. Creating placeholder request');
      
      // Create new request with placeholder sender
      const newRequest = {
        _id: new mongoose.Types.ObjectId(),
        requestId: requestId || `req_${Date.now()}`,
        sender: senderId,
        senderName: senderName,
        message: message || `${senderName} would like to be your friend!`,
        createdAt: new Date()
      };
      
      user.friendRequests.received.push(newRequest);
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: 'Friend request synchronized with placeholder sender',
        userInfo: {
          _id: user._id,
          username: user.username,
          email: user.email,
          friends: user.friends || [],
          friendRequests: user.friendRequests
        }
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Could not sync friend request - invalid sender information'
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

module.exports = router; 