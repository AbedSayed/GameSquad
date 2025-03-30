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
// router.post('/friends/add', protect, async (req, res) => { ... });
// router.post('/friends/request/:userId', protect, async (req, res) => { ... });
// router.post('/friends/sync-request', protect, async (req, res) => { ... });

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
    const senderIdFromBody = req.body.senderId; // Renamed to avoid conflict
    
    console.log(`Processing friend request acceptance: ${requestId} by user ${userId}`);
    
    // Find the user with populated friend requests
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize friendRequests if not exists
    if (!user.friendRequests) {
      user.friendRequests = { sent: [], received: [] };
    }
    
    if (!user.friendRequests.received) {
      user.friendRequests.received = [];
    }
    
    console.log('User friend requests:', JSON.stringify(user.friendRequests.received));
    
    // Try to find the request by ID first
    let requestIndex = user.friendRequests.received.findIndex(
      request => request._id && request._id.toString() === requestId
    );
    
    // If not found by ID but we have a senderId, try to find by sender
    if (requestIndex === -1 && senderIdFromBody) {
      console.log(`Request not found by ID. Looking for request from sender: ${senderIdFromBody}`);
      requestIndex = user.friendRequests.received.findIndex(request => {
        const reqSenderId = request.sender && typeof request.sender === 'object' 
          ? request.sender.toString() 
          : request.sender;
        return reqSenderId === senderIdFromBody;
      });
    }
    
    // If we still can't find the request and we have a senderId, create a virtual request
    if (requestIndex === -1 && senderIdFromBody) {
      console.log(`Creating virtual request for sender: ${senderIdFromBody}`);
      
      // Find the sender
      const sender = await User.findById(senderIdFromBody);
      
      if (!sender) {
        return res.status(404).json({ success: false, message: 'Sender not found' });
      }
      
      console.log(`Sender found: ${sender.username}, proceeding with virtual request`);
      
      // Initialize arrays if they don't exist
      if (!user.friends) {
        user.friends = [];
      }
      
      if (!sender.friends) {
        sender.friends = [];
      }
      
      // Check if they're already friends (convert ObjectIds to strings for comparison)
      const alreadyFriends = user.friends.some(id => id.toString() === senderIdFromBody);
      
      if (!alreadyFriends) {
        // Add each user to the other's friends list
        user.friends.push(senderIdFromBody);
        console.log(`Added ${sender.username} to ${user.username}'s friends`);
      } else {
        console.log(`${sender.username} is already in ${user.username}'s friends list`);
      }
      
      // Check if user is already in sender's friends list
      const userInSenderFriends = sender.friends.some(id => id.toString() === userId);
      
      if (!userInSenderFriends) {
        sender.friends.push(userId);
        console.log(`Added ${user.username} to ${sender.username}'s friends`);
      } else {
        console.log(`${user.username} is already in ${sender.username}'s friends list`);
      }
      
      // Save both users
      await user.save();
      await sender.save();
      
      console.log(`Virtual friend request processed: ${user.username} and ${sender.username} are now friends`);
      
      // Update localStorage data
      const userInfo = {
        _id: user._id,
        username: user.username,
        email: user.email,
        friends: user.friends,
        friendRequests: user.friendRequests
      };
      
      return res.status(200).json({ 
        success: true,
        message: 'Friend request accepted via virtual request', 
        userInfo 
      });
    }
    
    // If we couldn't find the request and didn't have a senderId to create a virtual request
    if (requestIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Friend request not found in user received requests. Please try again or refresh the page.' 
      });
    }
    
    const request = user.friendRequests.received[requestIndex];
    const requestSenderId = request.sender.toString();
    
    console.log(`Friend request sender ID: ${requestSenderId}`);
    
    // Find the sender
    const sender = await User.findById(requestSenderId);
    
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }
    
    console.log(`Sender found: ${sender.username}`);
    
    // Initialize arrays if they don't exist
    if (!user.friends) {
      user.friends = [];
    }
    
    if (!sender.friends) {
      sender.friends = [];
    }
    
    // Check if they're already friends (convert ObjectIds to strings for comparison)
    const alreadyFriends = user.friends.some(id => id.toString() === requestSenderId);
    
    if (!alreadyFriends) {
      // Add each user to the other's friends list
      user.friends.push(requestSenderId);
      console.log(`Added ${sender.username} to ${user.username}'s friends`);
    } else {
      console.log(`${sender.username} is already in ${user.username}'s friends list`);
    }
    
    // Check if user is already in sender's friends list
    const userInSenderFriends = sender.friends.some(id => id.toString() === userId);
    
    if (!userInSenderFriends) {
      sender.friends.push(userId);
      console.log(`Added ${user.username} to ${sender.username}'s friends`);
    } else {
      console.log(`${user.username} is already in ${sender.username}'s friends list`);
    }
    
    // Remove the request from received list
    user.friendRequests.received.splice(requestIndex, 1);
    
    // Find and remove the request from sender's sent list
    if (sender.friendRequests && sender.friendRequests.sent) {
      // Convert ObjectIds to strings for comparison with request sent to user
      const senderRequestIndex = sender.friendRequests.sent.findIndex(
        req => req.recipient && req.recipient.toString() === userId
      );
      
      if (senderRequestIndex !== -1) {
        sender.friendRequests.sent.splice(senderRequestIndex, 1);
        console.log(`Removed request from ${sender.username}'s sent list`);
      }
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
    const senderIdFromBody = req.body.senderId;
    
    console.log(`Processing friend request rejection: ${requestId} by user ${userId}`);
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize friendRequests if not exists
    if (!user.friendRequests) {
      user.friendRequests = { sent: [], received: [] };
    }
    
    if (!user.friendRequests.received) {
      user.friendRequests.received = [];
    }
    
    // Try to find the request by ID first
    let requestIndex = user.friendRequests.received.findIndex(
      request => request._id && request._id.toString() === requestId
    );
    
    // If not found by ID but we have a senderId, try to find by sender
    if (requestIndex === -1 && senderIdFromBody) {
      console.log(`Request not found by ID. Looking for request from sender: ${senderIdFromBody}`);
      requestIndex = user.friendRequests.received.findIndex(request => {
        const reqSenderId = request.sender && typeof request.sender === 'object' 
          ? request.sender.toString() 
          : request.sender;
        return reqSenderId === senderIdFromBody;
      });
    }
    
    // If we found the request, remove it
    if (requestIndex !== -1) {
      const request = user.friendRequests.received[requestIndex];
      const senderId = typeof request.sender === 'object' ? request.sender.toString() : request.sender;
      
      // Remove the request from the user
      user.friendRequests.received.splice(requestIndex, 1);
      await user.save();
      
      // Try to find and remove from sender's sent list if they exist
      if (senderId) {
        const sender = await User.findById(senderId);
        
        if (sender && sender.friendRequests && sender.friendRequests.sent) {
          const senderRequestIndex = sender.friendRequests.sent.findIndex(
            req => req.recipient && req.recipient.toString() === userId
          );
          
          if (senderRequestIndex !== -1) {
            sender.friendRequests.sent.splice(senderRequestIndex, 1);
            await sender.save();
            console.log(`Removed request from ${sender.username}'s sent list`);
          }
        }
      }
      
      return res.status(200).json({ 
        success: true,
        message: 'Friend request rejected',
        userInfo: {
          _id: user._id,
          username: user.username,
          email: user.email,
          friends: user.friends || [],
          friendRequests: user.friendRequests || { sent: [], received: [] }
        }
      });
    } 
    // If we have the sender ID but couldn't find the request, create a virtual rejection
    else if (senderIdFromBody) {
      console.log(`Creating virtual rejection for sender: ${senderIdFromBody}`);
      
      // Find the sender
      const sender = await User.findById(senderIdFromBody);
      
      if (sender && sender.friendRequests && sender.friendRequests.sent) {
        // Try to find the request in sender's sent list
        const senderRequestIndex = sender.friendRequests.sent.findIndex(
          req => req.recipient && req.recipient.toString() === userId
        );
        
        if (senderRequestIndex !== -1) {
          sender.friendRequests.sent.splice(senderRequestIndex, 1);
          await sender.save();
          console.log(`Removed request from ${sender.username}'s sent list through virtual rejection`);
        }
      }
      
      return res.status(200).json({ 
        success: true,
        message: 'Friend request virtually rejected',
        userInfo: {
          _id: user._id,
          username: user.username,
          email: user.email,
          friends: user.friends || [],
          friendRequests: user.friendRequests || { sent: [], received: [] }
        }
      });
    }
    
    // If we couldn't find the request and didn't have a senderId to create a virtual rejection
    return res.status(404).json({ 
      success: false, 
      message: 'Friend request not found' 
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
