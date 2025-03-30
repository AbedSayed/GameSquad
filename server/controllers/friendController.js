const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Ensures that user's friends array and friendRequests structure exists
 * @param {Object} user - The user document
 * @returns {Object} - The user with initialized friend structures
 */
const ensureFriendStructures = (user) => {
  if (!user.friends) {
    user.friends = [];
  }
  
  if (!user.friendRequests) {
    user.friendRequests = { sent: [], received: [] };
  }
  
  if (!user.friendRequests.sent) {
    user.friendRequests.sent = [];
  }
  
  if (!user.friendRequests.received) {
    user.friendRequests.received = [];
  }
  
  return user;
};

// @desc    Send friend request
// @route   POST /api/friends/request/:id
// @access  Private
const sendFriendRequest = asyncHandler(async (req, res) => {
  try {
    const senderId = req.user.id;
    const recipientId = req.params.id;
    const { message } = req.body;
    
    // Validate IDs before proceeding
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    
    // Cannot send friend request to yourself
    if (senderId === recipientId) {
      return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
    }
    
    // Find both users with a single query for efficiency
    const [sender, recipient] = await Promise.all([
      User.findById(senderId),
      User.findById(recipientId)
    ]);
    
    // Check if both users exist
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender user not found' });
    }
    
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found' });
    }
    
    // Initialize friend structures for both users
    ensureFriendStructures(sender);
    ensureFriendStructures(recipient);
    
    // Check if they're already friends
    if (sender.friends.some(friend => friend.toString() === recipientId)) {
      return res.status(400).json({ success: false, message: 'You are already friends with this user' });
    }
    
    // Check for existing pending request from sender to recipient
    const existingSentRequest = sender.friendRequests.sent.find(
      request => request.recipient && request.recipient.toString() === recipientId && request.status === 'pending'
    );
    
    if (existingSentRequest) {
      return res.status(400).json({ success: false, message: 'You have already sent a friend request to this user' });
    }
    
    // Check if recipient has already sent a request to the sender
    const existingReceivedRequest = sender.friendRequests.received.find(
      request => request.sender && request.sender.toString() === recipientId && request.status === 'pending'
    );
    
    if (existingReceivedRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'This user has already sent you a friend request. Check your friend requests to accept it.' 
      });
    }
    
    // Create a unique request ID
    const newRequestId = new mongoose.Types.ObjectId();
    const friendRequestMessage = message || 'I would like to be your friend!';
    const now = new Date();
    
    // Add to sender's sent requests
    sender.friendRequests.sent.push({
      _id: newRequestId,
      recipient: recipientId,
      status: 'pending',
      message: friendRequestMessage,
      createdAt: now
    });
    
    // Add to recipient's received requests
    recipient.friendRequests.received.push({
      _id: newRequestId,
      sender: senderId,
      status: 'pending',
      message: friendRequestMessage,
      createdAt: now
    });
    
    // Save both users with a single transaction for consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      await sender.save({ session });
      await recipient.save({ session });
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('new-friend-request', {
        senderId: senderId,
        senderName: sender.username,
        message: friendRequestMessage,
        timestamp: now,
        requestId: newRequestId,
        recipientId: recipientId
      });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Friend request sent successfully', 
      requestId: newRequestId
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

// @desc    Get friend requests
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    
    // Get user with populated friend requests
    const user = await User.findById(userId)
      .populate('friendRequests.sent.recipient', 'username email')
      .populate('friendRequests.received.sender', 'username email');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure friend structures exist
    ensureFriendStructures(user);
    
    const friendRequests = {
      sent: user.friendRequests.sent,
      received: user.friendRequests.received
    };
    
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

// @desc    Accept friend request
// @route   POST /api/friends/accept/:requestId
// @access  Private
const acceptFriendRequest = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure friend structures exist
    ensureFriendStructures(user);
    
    // Find the friend request in received requests
    const requestIndex = user.friendRequests.received.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    
    const friendRequest = user.friendRequests.received[requestIndex];
    
    // Check if the request is still pending
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Friend request already ${friendRequest.status}`
      });
    }
    
    const senderId = friendRequest.sender.toString();
    
    // Find the sender
    const sender = await User.findById(senderId);
    
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }
    
    // Ensure sender's friend structures exist
    ensureFriendStructures(sender);
    
    // Check if this request has already been processed (to prevent duplicate notifications)
    const alreadyFriends = user.friends.some(id => id.toString() === senderId) && 
                          sender.friends.some(id => id.toString() === userId);
    
    if (alreadyFriends) {
      return res.status(200).json({
        success: true,
        message: 'Friend request already accepted',
        data: {
          friendRequest,
          senderDetails: {
            _id: sender._id,
            username: sender.username,
            email: sender.email
          },
          userDetails: {
            _id: user._id,
            username: user.username,
            email: user.email
          }
        }
      });
    }
    
    // Start a transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update request status
      user.friendRequests.received[requestIndex].status = 'accepted';
      
      // Find and update the matching request in sender's sent requests
      const senderRequestIndex = sender.friendRequests.sent.findIndex(
        req => req._id.toString() === requestId
      );
      
      if (senderRequestIndex !== -1) {
        sender.friendRequests.sent[senderRequestIndex].status = 'accepted';
      }
      
      // Add each user to the other's friends list if not already friends
      if (!user.friends.some(id => id.toString() === senderId)) {
        user.friends.push(senderId);
      }
      
      if (!sender.friends.some(id => id.toString() === userId)) {
        sender.friends.push(userId);
      }
      
      // Save both users within the transaction
      await user.save({ session });
      await sender.save({ session });
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
    // Get sender and user details for response and socket events
    const senderDetails = {
      _id: sender._id,
      username: sender.username,
      email: sender.email
    };
    
    const userDetails = {
      _id: user._id,
      username: user.username,
      email: user.email
    };
    
    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Add a notification flag to prevent duplicate notifications
      const notificationData = {
        senderId: senderId, 
        acceptorId: userId,
        acceptorName: user.username,
        acceptorDetails: userDetails,
        timestamp: new Date().getTime(),
        requestId: requestId,
        source: 'api'
      };
      
      // Notify the sender
      io.to(`user:${senderId}`).emit('friend-request-accepted', notificationData);
      
      // Notify the acceptor (current user)
      io.to(`user:${userId}`).emit('friend-request-you-accepted', {
        recipientId: userId,
        senderId: senderId,
        senderDetails: senderDetails,
        timestamp: new Date().getTime(),
        requestId: requestId,
        source: 'api'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      data: {
        friendRequest,
        senderDetails,
        userDetails
      }
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return res.status(500).json({
      success: false,
      message: 'Error accepting friend request',
      error: error.message
    });
  }
});

// @desc    Reject friend request
// @route   POST /api/friends/reject/:requestId
// @access  Private
const rejectFriendRequest = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.params.requestId;
    
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure friend structures exist
    ensureFriendStructures(user);
    
    // Find the friend request in received requests
    const requestIndex = user.friendRequests.received.findIndex(
      req => req._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    
    const request = user.friendRequests.received[requestIndex];
    
    // Check if the request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Friend request already ${request.status}` 
      });
    }
    
    const senderId = request.sender.toString();
    
    // Start a transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update request status to rejected
      user.friendRequests.received[requestIndex].status = 'rejected';
      
      // Save the user
      await user.save({ session });
      
      // Find the sender user
      const sender = await User.findById(senderId);
      
      if (sender) {
        // Ensure sender's friend structures exist
        ensureFriendStructures(sender);
        
        // Find the matching sent request from the sender
        const senderRequestIndex = sender.friendRequests.sent.findIndex(
          req => req._id.toString() === requestId
        );
        
        if (senderRequestIndex !== -1) {
          sender.friendRequests.sent[senderRequestIndex].status = 'rejected';
          await sender.save({ session });
        }
      }
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${senderId}`).emit('friend-request-rejected', {
        rejectedBy: userId,
        rejectorName: user.username,
        requestId: requestId,
        timestamp: new Date()
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Friend request rejected successfully'
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

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
const getFriends = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    
    // Get user with populated friends
    const user = await User.findById(userId).populate('friends', 'username email profile');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure friend structures exist
    ensureFriendStructures(user);
    
    res.status(200).json({
      success: true,
      data: user.friends
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting friends',
      error: error.message
    });
  }
});

// @desc    Remove friend
// @route   DELETE /api/friends/:id
// @access  Private
const removeFriend = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    
    // Find both users
    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId)
    ]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!friend) {
      return res.status(404).json({ success: false, message: 'Friend not found' });
    }
    
    // Ensure friend structures exist
    ensureFriendStructures(user);
    ensureFriendStructures(friend);
    
    // Check if they are actually friends
    if (!user.friends.some(id => id.toString() === friendId)) {
      return res.status(400).json({ success: false, message: 'This user is not in your friends list' });
    }
    
    // Start a transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Remove from user's friends list
      user.friends = user.friends.filter(id => id.toString() !== friendId);
      
      // Remove from friend's friends list
      friend.friends = friend.friends.filter(id => id.toString() !== userId);
      
      // Save both users within the transaction
      await user.save({ session });
      await friend.save({ session });
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      // Notify the removed friend
      io.to(`user:${friendId}`).emit('friend-removed', {
        removedBy: userId,
        removerName: user.username,
        timestamp: new Date()
      });
      
      // Notify the current user
      io.to(`user:${userId}`).emit('you-removed-friend', {
        removedFriendId: friendId,
        removedFriendName: friend.username,
        timestamp: new Date()
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
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

// @desc    Check if users are friends
// @route   GET /api/friends/check/:id
// @access  Private
const checkFriendStatus = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    
    // Fetch the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure friend structures exist
    ensureFriendStructures(user);
    
    // Check friendship status
    const isFriend = user.friends.some(id => id.toString() === targetId);
    
    // Check for pending requests
    let pendingSent = false;
    let pendingReceived = false;
    
    pendingSent = user.friendRequests.sent.some(
      req => req.recipient.toString() === targetId && req.status === 'pending'
    );
    
    pendingReceived = user.friendRequests.received.some(
      req => req.sender.toString() === targetId && req.status === 'pending'
    );
    
    res.status(200).json({
      success: true,
      data: {
        isFriend,
        pendingSent,
        pendingReceived
      }
    });
  } catch (error) {
    console.error('Error checking friend status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking friend status',
      error: error.message
    });
  }
});

module.exports = {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  checkFriendStatus
}; 