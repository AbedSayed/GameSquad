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
