require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { connectDB } = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const Message = require('./models/Message');
const Lobby = require('./models/Lobby');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Import routes
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const lobbyRoutes = require('./routes/lobbyRoutes');

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/lobbies', lobbyRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Store user ID for this socket connection if logged in
    let currentUserId = null;
    
    // Log all events for debugging
    socket.onAny((event, ...args) => {
        console.log(`Socket ${socket.id} event: ${event}`, args);
    });
    
    // Handle user authentication with socket
    socket.on('authenticate', (data) => {
        if (data && data.userId) {
            currentUserId = data.userId;
            console.log(`Socket ${socket.id} authenticated as user ${currentUserId}`);
            
            // Join a personal room for this user to receive notifications
            socket.join(`user:${currentUserId}`);
            
            // Let the user know they're authenticated
            socket.emit('authenticated', { success: true });
        }
    });
    
    // Handle friend request events
    socket.on('friend-request-sent', async (data) => {
        if (!data || !data.recipientId) {
            console.error('Invalid friend request data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} sent friend request to ${data.recipientId}`);
        
        // Emit to recipient's personal room
        io.to(`user:${data.recipientId}`).emit('new-friend-request', {
            senderId: currentUserId,
            senderName: data.senderName || 'A user',
            timestamp: new Date()
        });
    });
    
    socket.on('friend-request-accepted', async (data) => {
        if (!data || !data.senderId) {
            console.error('Invalid friend request acceptance data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} accepted friend request from ${data.senderId}`);
        
        // Emit to original sender's personal room
        io.to(`user:${data.senderId}`).emit('friend-request-accepted', {
            acceptedBy: currentUserId,
            acceptedByName: data.acceptorName || 'A user',
            timestamp: new Date()
        });
    });
    
    socket.on('friend-request-rejected', async (data) => {
        if (!data || !data.senderId) {
            console.error('Invalid friend request rejection data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} rejected friend request from ${data.senderId}`);
        
        // Optionally notify the sender that their request was rejected
        // Uncomment if you want the sender to know their request was rejected
        /*
        io.to(`user:${data.senderId}`).emit('friend-request-rejected', {
            rejectedBy: currentUserId,
            timestamp: new Date()
        });
        */
    });
    
    socket.on('friend-removed', async (data) => {
        if (!data || !data.friendId) {
            console.error('Invalid friend removal data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} removed friend ${data.friendId}`);
        
        // Optionally notify the removed friend
        // Uncomment if you want the removed friend to know they were removed
        /*
        io.to(`user:${data.friendId}`).emit('friend-removed', {
            removedBy: currentUserId,
            timestamp: new Date()
        });
        */
    });

    // Handle joining a lobby
    socket.on('join-lobby', async (data) => {
        if (!data || !data.lobbyId) {
            console.error('Invalid join-lobby data:', data);
            return;
        }
        
        console.log(`Socket ${socket.id} joining lobby:`, data.lobbyId);
        socket.join(data.lobbyId);
        
        // Broadcast to the room that a new user joined
        io.to(data.lobbyId).emit('user-joined', {
            message: 'New user joined the lobby',
            socketId: socket.id,
            timestamp: new Date()
        });
        
        // Create system message
        const systemMessage = {
            username: 'System',
            text: 'A new user joined the lobby',
            timestamp: new Date(),
            isSystem: true
        };
        
        // Save system message to database
        try {
            await Message.create({
                lobbyId: data.lobbyId,
                username: 'System',
                text: 'A new user joined the lobby',
                isSystem: true,
                timestamp: new Date()
            });
        } catch (dbError) {
            console.error('Error saving system message to database:', dbError);
        }
        
        // Also send system message to chat
        io.to(data.lobbyId).emit('chat-message', systemMessage);
    });

    // Handle leaving a lobby
    socket.on('leave-lobby', async (data) => {
        if (!data || !data.lobbyId) {
            console.error('Invalid leave-lobby data:', data);
            return;
        }
        
        console.log(`Socket ${socket.id} leaving lobby:`, data.lobbyId);
        socket.leave(data.lobbyId);
        
        // Broadcast to the room that a user left
        io.to(data.lobbyId).emit('user-left', {
            message: 'A user left the lobby',
            socketId: socket.id,
            timestamp: new Date()
        });
        
        // Create system message
        const systemMessage = {
            username: 'System',
            text: 'A user left the lobby',
            timestamp: new Date(),
            isSystem: true
        };
        
        // Save system message to database
        try {
            await Message.create({
                lobbyId: data.lobbyId,
                username: 'System',
                text: 'A user left the lobby',
                isSystem: true,
                timestamp: new Date()
            });
        } catch (dbError) {
            console.error('Error saving system message to database:', dbError);
        }
        
        // Also send system message to chat
        io.to(data.lobbyId).emit('chat-message', systemMessage);
    });

    // Handle sending a message
    socket.on('send-message', async (data) => {
        console.log('New message received from socket', socket.id, ':', data);
        
        // Validate message data
        if (!data || !data.lobbyId || !data.message) {
            console.error('Invalid message data:', data);
            return;
        }
        
        try {
            const messageToSend = {
                username: data.username || 'Anonymous',
                text: data.message,
                timestamp: new Date(),
                senderId: socket.id
            };
            
            console.log('Broadcasting message to lobby:', data.lobbyId, messageToSend);
            
            // Save message to database
            try {
                await Message.create({
                    lobbyId: data.lobbyId,
                    sender: data.userId, // If available
                    username: data.username || 'Anonymous',
                    text: data.message,
                    isSystem: false,
                    timestamp: new Date()
                });
                console.log('Message saved to database');
            } catch (dbError) {
                console.error('Error saving message to database:', dbError);
                // Continue even if save fails - messages will still be sent in real-time
            }
            
            // Broadcast to the lobby including the sender
            io.to(data.lobbyId).emit('chat-message', messageToSend);
            
            // Send direct acknowledgment to sender
            socket.emit('message-sent', {
                success: true,
                messageId: Date.now(),
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('message-error', {
                success: false,
                error: 'Server error sending message'
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Handle routes for the pages directory
app.get('/pages/*', (req, res) => {
    const filePath = path.join(__dirname, '../public', req.path);
    res.sendFile(filePath);
});

// Serve lobby page for direct lobby access
app.get('/lobby/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/lobby.html'));
});

// Root path - serve landing for non-auth, index for auth
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/landing.html'));
});

// All other routes - send to index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Connect to database and start server
connectDB()
    .then(() => {
        const PORT = process.env.PORT || 8080;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Access the application at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database connection failed:', error);
        process.exit(1);
    });
