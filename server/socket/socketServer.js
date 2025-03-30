const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Profile, Lobby } = require('../models');

// Map to store active user connections
const activeUsers = new Map();

// Initialize socket server
const initializeSocketServer = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle connections
  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    
    // Add user to active users map
    activeUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      userId: socket.user._id,
      username: socket.user.username,
      displayName: socket.user.displayName || socket.user.username
    });
    
    // Update user's online status
    try {
      await User.findByIdAndUpdate(socket.user._id, { onlineStatus: 'online' });
      
      // Emit updated online users list to all clients
      io.emit('onlineUsers', Array.from(activeUsers.values()));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
    
    // Join user to their personal room for private messages
    socket.join(`user:${socket.user._id}`);
    
    // Join user to rooms for their lobbies
    try {
      const userLobbies = await Lobby.find({ 'members.user': socket.user._id });
      
      userLobbies.forEach(lobby => {
        socket.join(`lobby:${lobby._id}`);
        console.log(`${socket.user.username} joined room: lobby:${lobby._id}`);
      });
    } catch (error) {
      console.error('Error joining lobby rooms:', error);
    }
    
    // Handle friend request
    socket.on('sendFriendRequest', async ({ recipientId, message }) => {
      try {
        // Validate recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return socket.emit('error', { message: 'Recipient not found' });
        }
        
        // Get sender user
        const sender = await User.findById(socket.user._id);
        if (!sender) {
          return socket.emit('error', { message: 'Sender not found' });
        }
        
        // Ensure friend structures exist
        if (!sender.friends) sender.friends = [];
        if (!sender.friendRequests) sender.friendRequests = { sent: [], received: [] };
        if (!sender.friendRequests.sent) sender.friendRequests.sent = [];
        
        if (!recipient.friends) recipient.friends = [];
        if (!recipient.friendRequests) recipient.friendRequests = { sent: [], received: [] };
        if (!recipient.friendRequests.received) recipient.friendRequests.received = [];
        
        // Check if they're already friends
        if (sender.friends.some(id => id.toString() === recipientId)) {
          return socket.emit('error', { message: 'You are already friends with this user' });
        }
        
        // Check for existing pending request
        const existingSentRequest = sender.friendRequests.sent.find(
          request => request.recipient && request.recipient.toString() === recipientId && request.status === 'pending'
        );
        
        if (existingSentRequest) {
          return socket.emit('error', { message: 'Friend request already sent' });
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
          sender: socket.user._id,
          status: 'pending',
          message: friendRequestMessage,
          createdAt: now
        });
        
        // Save both users
        await Promise.all([sender.save(), recipient.save()]);
        
        // Emit to sender
        socket.emit('friendRequestSent', {
          requestId: newRequestId,
          recipient: {
            _id: recipient._id,
            username: recipient.username
          }
        });
        
        // Emit to recipient if online
        io.to(`user:${recipientId}`).emit('newFriendRequest', {
          requestId: newRequestId,
          sender: {
            _id: sender._id,
            username: sender.username
          },
          message: friendRequestMessage,
          timestamp: now
        });
      } catch (error) {
        console.error('Error sending friend request:', error);
        socket.emit('error', { message: 'Failed to send friend request' });
      }
    });
    
    // Handle accepting friend request
    socket.on('acceptFriendRequest', async ({ requestId }) => {
      try {
        // Find the user and request
        const user = await User.findById(socket.user._id);
        if (!user) {
          return socket.emit('error', { message: 'User not found' });
        }
        
        // Ensure friend structures exist
        if (!user.friends) user.friends = [];
        if (!user.friendRequests) user.friendRequests = { sent: [], received: [] };
        if (!user.friendRequests.received) user.friendRequests.received = [];
        
        // Find the request
        const requestIndex = user.friendRequests.received.findIndex(
          req => req._id.toString() === requestId
        );
        
        if (requestIndex === -1) {
          return socket.emit('error', { message: 'Friend request not found' });
        }
        
        const request = user.friendRequests.received[requestIndex];
        
        // Check if the request is still pending
        if (request.status !== 'pending') {
          return socket.emit('error', { message: `Friend request already ${request.status}` });
        }
        
        const senderId = request.sender.toString();
        
        // Find the sender
        const sender = await User.findById(senderId);
        if (!sender) {
          return socket.emit('error', { message: 'Sender not found' });
        }
        
        // Ensure sender's friend structures exist
        if (!sender.friends) sender.friends = [];
        if (!sender.friendRequests) sender.friendRequests = { sent: [], received: [] };
        if (!sender.friendRequests.sent) sender.friendRequests.sent = [];
        
        // Check if they're already friends (to prevent duplicate processing)
        const alreadyFriends = user.friends.some(id => id.toString() === senderId) && 
                              sender.friends.some(id => id.toString() === user._id.toString());
        
        if (alreadyFriends) {
          return socket.emit('friendRequestAccepted', {
            friend: {
              _id: sender._id,
              username: sender.username
            },
            alreadyProcessed: true
          });
        }
        
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
        
        if (!sender.friends.some(id => id.toString() === user._id.toString())) {
          sender.friends.push(user._id);
        }
        
        // Save both users
        await Promise.all([user.save(), sender.save()]);
        
        // Create notification data with source flag to prevent duplicate processing
        const timestamp = new Date().getTime();
        
        // Emit to user who accepted
        socket.emit('friendRequestAccepted', {
          friend: {
            _id: sender._id,
            username: sender.username
          },
          timestamp: timestamp,
          requestId: requestId,
          source: 'socket'
        });
        
        // Emit to the other user if online
        io.to(`user:${senderId}`).emit('friendRequestAcceptedBy', {
          friend: {
            _id: user._id,
            username: user.username
          },
          timestamp: timestamp,
          requestId: requestId,
          source: 'socket'
        });
      } catch (error) {
        console.error('Error accepting friend request:', error);
        socket.emit('error', { message: 'Failed to accept friend request' });
      }
    });
    
    // Handle rejecting friend request
    socket.on('rejectFriendRequest', async ({ requestId }) => {
      try {
        // Find the user and request
        const user = await User.findById(socket.user._id);
        if (!user) {
          return socket.emit('error', { message: 'User not found' });
        }
        
        // Ensure friend structures exist
        if (!user.friendRequests) user.friendRequests = { sent: [], received: [] };
        if (!user.friendRequests.received) user.friendRequests.received = [];
        
        // Find the request
        const requestIndex = user.friendRequests.received.findIndex(
          req => req._id.toString() === requestId
        );
        
        if (requestIndex === -1) {
          return socket.emit('error', { message: 'Friend request not found' });
        }
        
        const request = user.friendRequests.received[requestIndex];
        
        // Check if the request is still pending
        if (request.status !== 'pending') {
          return socket.emit('error', { message: `Friend request already ${request.status}` });
        }
        
        const senderId = request.sender.toString();
        
        // Update request status to rejected
        user.friendRequests.received[requestIndex].status = 'rejected';
        await user.save();
        
        // Find and update the sender's sent request if they exist
        const sender = await User.findById(senderId);
        if (sender) {
          // Ensure sender's friend structures exist
          if (!sender.friendRequests) sender.friendRequests = { sent: [], received: [] };
          if (!sender.friendRequests.sent) sender.friendRequests.sent = [];
          
          // Find the matching sent request
          const senderRequestIndex = sender.friendRequests.sent.findIndex(
            req => req._id.toString() === requestId
          );
          
          if (senderRequestIndex !== -1) {
            sender.friendRequests.sent[senderRequestIndex].status = 'rejected';
            await sender.save();
          }
          
          // Notify sender if online
          io.to(`user:${senderId}`).emit('friendRequestRejected', {
            rejector: {
              _id: user._id,
              username: user.username
            },
            requestId
          });
        }
        
        // Notify rejector
        socket.emit('friendRequestRejectionComplete', { requestId });
      } catch (error) {
        console.error('Error rejecting friend request:', error);
        socket.emit('error', { message: 'Failed to reject friend request' });
      }
    });
    
    // Handle removing friend
    socket.on('removeFriend', async ({ friendId }) => {
      try {
        // Find both users
        const [user, friend] = await Promise.all([
          User.findById(socket.user._id),
          User.findById(friendId)
        ]);
        
        if (!user) {
          return socket.emit('error', { message: 'User not found' });
        }
        
        if (!friend) {
          return socket.emit('error', { message: 'Friend not found' });
        }
        
        // Ensure friend structures exist
        if (!user.friends) user.friends = [];
        if (!friend.friends) friend.friends = [];
        
        // Check if they are actually friends
        if (!user.friends.some(id => id.toString() === friendId)) {
          return socket.emit('error', { message: 'This user is not in your friends list' });
        }
        
        // Remove from user's friends list
        user.friends = user.friends.filter(id => id.toString() !== friendId);
        
        // Remove from friend's friends list
        friend.friends = friend.friends.filter(id => id.toString() !== user._id.toString());
        
        // Save both users
        await Promise.all([user.save(), friend.save()]);
        
        // Notify user who removed
        socket.emit('friendRemoved', {
          friend: {
            _id: friend._id,
            username: friend.username
          }
        });
        
        // Notify removed friend if online
        io.to(`user:${friendId}`).emit('removedAsFriend', {
          by: {
            _id: user._id,
            username: user.username
          }
        });
      } catch (error) {
        console.error('Error removing friend:', error);
        socket.emit('error', { message: 'Failed to remove friend' });
      }
    });
    
    // Handle joining a lobby
    socket.on('joinLobby', async (data) => {
      try {
        const lobby = await Lobby.findById(data.lobbyId);
        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        if (lobby.players.length >= lobby.maxPlayers) {
          socket.emit('error', { message: 'Lobby is full' });
          return;
        }

        // Add player to lobby
        lobby.players.push({
          user: data.userId,
          ready: false
        });
        lobby.currentPlayers = lobby.players.length;
        await lobby.save();

        // Join socket room
        socket.join(data.lobbyId);
        
        // Notify all clients in the lobby
        io.to(data.lobbyId).emit('playerJoined', {
          lobby: await lobby.populate('players.user', 'username')
        });
      } catch (error) {
        console.error('Error joining lobby:', error);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });
    
    // Handle leaving a lobby
    socket.on('leaveLobby', async (data) => {
      try {
        const lobby = await Lobby.findById(data.lobbyId);
        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        // Remove player from lobby
        lobby.players = lobby.players.filter(
          player => player.user.toString() !== data.userId
        );
        lobby.currentPlayers = lobby.players.length;
        await lobby.save();

        // Leave socket room
        socket.leave(data.lobbyId);
        
        // Notify remaining clients
        io.to(data.lobbyId).emit('playerLeft', {
          lobby: await lobby.populate('players.user', 'username'),
          userId: data.userId
        });
      } catch (error) {
        console.error('Error leaving lobby:', error);
        socket.emit('error', { message: 'Failed to leave lobby' });
      }
    });
    
    // Handle player ready status
    socket.on('toggleReady', async (data) => {
      try {
        const lobby = await Lobby.findById(data.lobbyId);
        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        // Update player ready status
        const player = lobby.players.find(
          p => p.user.toString() === data.userId
        );
        if (player) {
          player.ready = !player.ready;
          await lobby.save();

          // Notify all clients in the lobby
          io.to(data.lobbyId).emit('playerReadyChanged', {
            lobby: await lobby.populate('players.user', 'username'),
            userId: data.userId,
            ready: player.ready
          });
        }
      } catch (error) {
        console.error('Error toggling ready status:', error);
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });
    
    // Handle lobby chat messages
    socket.on('lobbyChatMessage', async ({ lobbyId, message }) => {
      try {
        if (!message.trim()) {
          return;
        }
        
        // Create message object
        const messageObj = {
          user: {
            _id: socket.user._id,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username
          },
          text: message,
          timestamp: new Date()
        };
        
        // Save message to database
        await Lobby.findByIdAndUpdate(lobbyId, {
          $push: {
            messages: {
              user: socket.user._id,
              text: message,
              timestamp: new Date()
            }
          }
        });
        
        // Emit message to all users in the lobby
        io.to(`lobby:${lobbyId}`).emit('newLobbyChatMessage', {
          lobbyId,
          message: messageObj
        });
      } catch (error) {
        console.error('Error sending lobby message:', error);
      }
    });
    
    // Handle private messages
    socket.on('privateMessage', async ({ recipientId, message }) => {
      try {
        if (!message.trim()) {
          return;
        }
        
        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        
        if (!recipient) {
          return socket.emit('error', { message: 'Recipient not found' });
        }
        
        // Create message object
        const messageObj = {
          sender: {
            _id: socket.user._id,
            username: socket.user.username,
            displayName: socket.user.displayName || socket.user.username
          },
          recipient: {
            _id: recipient._id,
            username: recipient.username,
            displayName: recipient.displayName || recipient.username
          },
          text: message,
          timestamp: new Date()
        };
        
        // Emit to sender
        socket.emit('newPrivateMessage', messageObj);
        
        // Emit to recipient if online
        io.to(`user:${recipientId}`).emit('newPrivateMessage', messageObj);
        
        // TODO: Save private messages to database if needed
        // This would require creating a private message model
      } catch (error) {
        console.error('Error sending private message:', error);
      }
    });
    
    // Handle typing indicators for lobby chat
    socket.on('lobbyTyping', ({ lobbyId, isTyping }) => {
      socket.to(`lobby:${lobbyId}`).emit('userTyping', {
        lobbyId,
        user: {
          _id: socket.user._id,
          username: socket.user.username
        },
        isTyping
      });
    });
    
    // Handle typing indicators for private chat
    socket.on('privateTyping', ({ recipientId, isTyping }) => {
      io.to(`user:${recipientId}`).emit('userPrivateTyping', {
        user: {
          _id: socket.user._id,
          username: socket.user.username
        },
        isTyping
      });
    });
    
    // Handle lobby invitations
    socket.on('lobbyInvitation', ({ lobbyId, recipientId }) => {
      io.to(`user:${recipientId}`).emit('newLobbyInvitation', {
        lobbyId,
        inviter: {
          _id: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName || socket.user.username
        }
      });
    });
    
    // Handle user status updates
    socket.on('updateStatus', async (status) => {
      try {
        if (!['online', 'offline', 'away', 'busy'].includes(status)) {
          return;
        }
        
        // Update user status in database
        await User.findByIdAndUpdate(socket.user._id, { onlineStatus: status });
        
        // Update active users map
        if (activeUsers.has(socket.user._id.toString())) {
          const userData = activeUsers.get(socket.user._id.toString());
          userData.status = status;
          activeUsers.set(socket.user._id.toString(), userData);
        }
        
        // Broadcast status change to all users
        io.emit('userStatusChanged', {
          userId: socket.user._id,
          status
        });
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
      
      // Remove user from active users map
      activeUsers.delete(socket.user._id.toString());
      
      // Update user's online status
      try {
        await User.findByIdAndUpdate(socket.user._id, { onlineStatus: 'offline' });
        
        // Emit updated online users list to all clients
        io.emit('onlineUsers', Array.from(activeUsers.values()));
        
        // Broadcast status change to all users
        io.emit('userStatusChanged', {
          userId: socket.user._id,
          status: 'offline'
        });
      } catch (error) {
        console.error('Error updating user status on disconnect:', error);
      }
    });
  });

  return io;
};

module.exports = initializeSocketServer;
