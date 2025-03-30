const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const mongoose = require('mongoose');
const FriendRequest = require('../models/FriendRequest');

// @desc    Send friend request
// @route   POST /api/friends/request/:id
// @access  Private
const sendFriendRequest = asyncHandler(async (req, res) => {
  try {
    const senderId = req.user.id;
    const recipientId = req.params.id;
    const { message } = req.body;
    
    console.log(`Processing friend request from ${senderId} to ${recipientId}`);
    
    // Check if users exist
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);
    
    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender user not found' });
    }
    
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found' });
    }
    
    if (senderId === recipientId) {
      return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
    }
    
    // Check if they're already friends
    if (sender.friends && sender.friends.some(friend => friend.toString() === recipientId)) {
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
      request => request.recipient && request.recipient.toString() === recipientId && request.status === 'pending'
    );
    
    if (existingSentRequest) {
      return res.status(400).json({ success: false, message: 'You have already sent a friend request to this user' });
    }
    
    // Also check if recipient has already sent a request to the sender
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
    
    // Add to sender's sent requests
    sender.friendRequests.sent.push({
      _id: newRequestId,
      recipient: recipientId,
      status: 'pending',
      message: message || 'I would like to be your friend!',
      createdAt: new Date()
    });
    
    // Add to recipient's received requests
    recipient.friendRequests.received.push({
      _id: newRequestId,
      sender: senderId,
      status: 'pending',
      message: message || 'I would like to be your friend!',
      createdAt: new Date()
    });
    
    await sender.save();
    await recipient.save();
    
    console.log(`Friend request from ${sender.username} to ${recipient.username} created successfully`);
    
    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('new-friend-request', {
        senderId: senderId,
        senderName: sender.username,
        message: message || 'I would like to be your friend!',
        timestamp: new Date(),
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
    
    // Get user with populated friend requests
    const user = await User.findById(userId)
      .populate('friendRequests.sent.recipient', 'username email')
      .populate('friendRequests.received.sender', 'username email');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Format the friend requests for easy consumption
    const friendRequests = {
      sent: user.friendRequests?.sent || [],
      received: user.friendRequests?.received || []
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

    console.log(`User ${userId} is accepting friend request ${requestId}`);

    // Find the user and their received request
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ensure friendRequests structure exists
    if (!user.friendRequests) {
      user.friendRequests = { sent: [], received: [] };
    }

    // Find the request in the user's received requests
    const requestIndex = user.friendRequests.received.findIndex(
      req => req._id.toString() === requestId
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    const friendRequest = user.friendRequests.received[requestIndex];
    const senderId = friendRequest.sender.toString();

    // Check if the request is still pending
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Friend request already ${friendRequest.status}`
      });
    }

    // Find the sender
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    // Ensure sender's friendRequests structure exists
    if (!sender.friendRequests) {
      sender.friendRequests = { sent: [], received: [] };
    }

    // Update request status in user's received requests
    user.friendRequests.received[requestIndex].status = 'accepted';

    // Find and update the matching request in sender's sent requests
    const senderRequestIndex = sender.friendRequests.sent.findIndex(
      req => req._id.toString() === requestId
    );

    if (senderRequestIndex !== -1) {
      sender.friendRequests.sent[senderRequestIndex].status = 'accepted';
    }

    // Add each user to the other's friends list if not already friends
    if (!user.friends) {
      user.friends = [];
    }
    if (!sender.friends) {
      sender.friends = [];
    }

    // Check if they're already friends and add if not
    if (!user.friends.some(id => id.toString() === senderId)) {
      user.friends.push(senderId);
    }

    // Add the user to the sender's friends list if not already a friend
    if (!sender.friends.some(id => id.toString() === userId)) {
      sender.friends.push(userId);
    }

    // Save both users
    await user.save();
    await sender.save();

    // Get sender and user details for response and socket events
    const senderDetails = {
      _id: sender._id,
      username: sender.username,
      email: sender.email,
      profile: sender.profile
    };

    const userDetails = {
      _id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile
    };

    // Emit a socket event to notify the sender
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${senderId}`).emit('friend-request-accepted', { 
        senderId: senderId, 
        acceptorName: user.username,
        acceptorDetails: userDetails
      });
    }

    // Emit an event to the acceptor (current user) as well
    if (io) {
      io.to(`user:${userId}`).emit('friend-request-you-accepted', { 
        recipientId: userId,
        senderDetails: senderDetails
      });
    }

    console.log(`User ${userId} accepted friend request from ${senderId}`);

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
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure friendRequests structure exists
    if (!user.friendRequests) {
      user.friendRequests = { sent: [], received: [] };
    }
    
    if (!user.friendRequests.received) {
      user.friendRequests.received = [];
    }
    
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
    
    // Update request status to rejected
    user.friendRequests.received[requestIndex].status = 'rejected';
    
    // Find the sender user
    const sender = await User.findById(senderId);
    
    if (sender) {
      // Ensure sender's friendRequests structure exists
      if (!sender.friendRequests) {
        sender.friendRequests = { sent: [], received: [] };
      }
      
      if (!sender.friendRequests.sent) {
        sender.friendRequests.sent = [];
      }
      
      // Find the matching sent request from the sender
      const senderRequestIndex = sender.friendRequests.sent.findIndex(
        req => req._id.toString() === requestId
      );
      
      if (senderRequestIndex !== -1) {
        sender.friendRequests.sent[senderRequestIndex].status = 'rejected';
        await sender.save();
      }
    }
    
    await user.save();
    
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
    
    // Get user with populated friends
    const user = await User.findById(userId).populate('friends', 'username email');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const friends = user.friends || [];
    
    res.status(200).json({
      success: true,
      data: friends
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
    
    // Find both users
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if the friend exists
    if (!friend) {
      return res.status(404).json({ success: false, message: 'Friend not found' });
    }
    
    // Check if they are actually friends
    if (!user.friends || !user.friends.some(id => id.toString() === friendId)) {
      return res.status(400).json({ success: false, message: 'This user is not in your friends list' });
    }
    
    // Initialize friends array if it doesn't exist
    if (!user.friends) {
      user.friends = [];
    }
    
    // Remove from user's friends list
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    
    // Initialize friend's friends array if it doesn't exist
    if (!friend.friends) {
      friend.friends = [];
    }
    
    // Remove from friend's friends list
    friend.friends = friend.friends.filter(id => id.toString() !== userId);
    
    // Save both users
    await user.save();
    await friend.save();
    
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

module.exports = {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend
}; 