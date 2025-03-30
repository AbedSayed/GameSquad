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
const PrivateMessage = require('./models/PrivateMessage');

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // 60 seconds (increase from default)
    pingInterval: 25000, // 25 seconds (default)
    connectTimeout: 30000, // 30 seconds connection timeout
    maxHttpBufferSize: 1e8 // 100 MB max buffer size
});

const userSocketMap = {};
app.set('userSocketMap', userSocketMap);

app.set('io', io);

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static(path.join(__dirname, '../public')));

const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const lobbyRoutes = require('./routes/lobbyRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const friendRoutes = require('./routes/friendRoutes');

app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/lobbies', lobbyRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/friends', friendRoutes);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    let currentUserId = null;
    
    socket.onAny((event, ...args) => {
        console.log(`Socket ${socket.id} event: ${event}`, args);
    });
    
    socket.on('authenticate', (data) => {
        if (data && data.userId) {
            currentUserId = data.userId;
            console.log(`Socket ${socket.id} authenticated as user ${currentUserId}`);
            
            userSocketMap[currentUserId] = socket.id;
            
            socket.join(`user:${currentUserId}`);
            
            socket.emit('authenticated', { success: true });
        } else {
            socket.emit('auth_error', { success: false, error: 'Invalid authentication data' });
        }
    });
    
    socket.on('ping', (data, callback) => {
        if (callback) {
            callback({
                authenticated: !!currentUserId,
                userId: currentUserId
            });
        }
    });
    
    socket.on('friend-request-sent', async (data) => {
        if (!data || !data.recipientId) {
            console.error('Invalid friend request data:', data);
            return;
        }
        
        console.log(`Socket ${socket.id}: User ${currentUserId} sent friend request to ${data.recipientId}`);
        
        io.to(`user:${data.recipientId}`).emit('new-friend-request', {
            senderId: currentUserId,
            senderName: data.senderName || 'A user',
            message: data.message || 'would like to be your friend!',
            timestamp: new Date(),
            requestId: data.requestId,
            recipientId: data.recipientId
        });
        
        socket.emit('friend-request-sent-confirmation', {
            success: true,
            recipientId: data.recipientId,
            message: `Friend request sent to ${data.recipientId}`
        });
    });
    
    socket.on('friend-request-accepted', async (data) => {
        if (!data || !data.senderId) {
            console.error('Invalid friend request acceptance data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} accepted friend request from ${data.senderId}`);
        
        try {
            const { User } = require('./models');
            const acceptingUser = await User.findById(currentUserId);
            
            if (!acceptingUser) {
                console.error(`User ${currentUserId} not found when accepting request`);
                return;
            }
            
            const acceptorDetails = {
                _id: acceptingUser._id,
                username: acceptingUser.username,
                email: acceptingUser.email,
                profile: acceptingUser.profile
            };
            
            io.to(`user:${data.senderId}`).emit('friend-request-accepted', {
                senderId: data.senderId,
                acceptorName: acceptingUser.username,
                acceptorDetails: acceptorDetails,
                requestId: data.requestId,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error in friend-request-accepted handler:', error);
        }
    });
    
    socket.on('friend-request-rejected', async (data) => {
        if (!data || !data.senderId) {
            console.error('Invalid friend request rejection data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} rejected friend request from ${data.senderId}`);
        
        io.to(`user:${data.senderId}`).emit('friend-request-rejected', {
            rejectedBy: currentUserId,
            rejectorName: data.rejectorName || 'A user',
            requestId: data.requestId,
            timestamp: new Date()
        });
    });
    
    socket.on('friend-removed', async (data) => {
        if (!data || !data.friendId) {
            console.error('Invalid friend removal data:', data);
            return;
        }
        
        console.log(`User ${currentUserId} removed friend ${data.friendId}`);
        
        io.to(`user:${data.friendId}`).emit('friend-removed', {
            removedBy: currentUserId,
            removerName: data.removerName || 'A user',
            timestamp: new Date()
        });
        
        socket.emit('you-removed-friend', {
            removedFriendId: data.friendId,
            removedFriendName: data.friendName || 'Your friend',
            timestamp: new Date()
        });
    });

    socket.on('join-lobby', async (data) => {
        if (!data || !data.lobbyId) {
            console.error('Invalid join-lobby data:', data);
            return;
        }
        
        console.log(`Socket ${socket.id} joining lobby:`, data.lobbyId);
        socket.join(data.lobbyId);
        
        io.to(data.lobbyId).emit('user-joined', {
            message: 'New user joined the lobby',
            socketId: socket.id,
            timestamp: new Date()
        });
        
        const systemMessage = {
            username: 'System',
            text: 'A new user joined the lobby',
            timestamp: new Date(),
            isSystem: true
        };
        
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
        
        io.to(data.lobbyId).emit('chat-message', systemMessage);
    });

    socket.on('leave-lobby', async (data) => {
        if (!data || !data.lobbyId) {
            console.error('Invalid leave-lobby data:', data);
            return;
        }
        
        console.log(`Socket ${socket.id} leaving lobby:`, data.lobbyId);
        socket.leave(data.lobbyId);
        
        io.to(data.lobbyId).emit('user-left', {
            message: 'A user left the lobby',
            socketId: socket.id,
            timestamp: new Date()
        });
        
        const systemMessage = {
            username: 'System',
            text: 'A user left the lobby',
            timestamp: new Date(),
            isSystem: true
        };
        
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
        
        io.to(data.lobbyId).emit('chat-message', systemMessage);
    });

    socket.on('send-message', async (data) => {
        console.log('New message received from socket', socket.id, ':', data);
        
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
            
            try {
                await Message.create({
                    lobbyId: data.lobbyId,
                    sender: data.userId,
                    username: data.username || 'Anonymous',
                    text: data.message,
                    isSystem: false,
                    timestamp: new Date()
                });
                console.log('Message saved to database');
            } catch (dbError) {
                console.error('Error saving message to database:', dbError);
            }
            
            io.to(data.lobbyId).emit('chat-message', messageToSend);
            
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

    socket.on('privateMessage', async (data, callback) => {
        console.log('New private message received:', data);
        
        if (!data || !data.recipientId || !data.message) {
            console.error('Invalid private message data:', data);
            if (callback) callback({ success: false, error: 'Invalid message data' });
            return;
        }
        
        try {
            if (!currentUserId) {
                console.error('Cannot send private message: Socket not authenticated');
                if (callback) callback({ success: false, error: 'Not authenticated' });
                return;
            }
            
            const recipientSocketId = userSocketMap[data.recipientId];
            
            const messageObj = {
                senderId: currentUserId,
                recipientId: data.recipientId,
                text: data.message,
                timestamp: data.timestamp || new Date().toISOString(),
                messageId: data.messageId
            };
            
            try {
                await PrivateMessage.create({
                    sender: currentUserId,
                    recipient: data.recipientId,
                    text: data.message,
                    messageId: data.messageId,
                    timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
                });
                console.log('Private message saved to database');
            } catch (dbError) {
                console.error('Error saving private message to database:', dbError);
            }
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('newPrivateMessage', messageObj);
            }
            
            socket.emit('privateMsgDelivered', {
                success: true,
                messageId: data.messageId,
                status: 'delivered',
                timestamp: new Date().toISOString()
            });
            
            if (callback) {
                callback({ 
                    success: true, 
                    messageId: data.messageId,
                    delivered: !!recipientSocketId 
                });
            }
        } catch (error) {
            console.error('Error handling private message:', error);
            if (callback) {
                callback({ success: false, error: 'Server error processing message' });
            }
        }
    });

    socket.on('loadPrivateMessages', async (data, callback) => {
        console.log('Loading private messages:', data);
        
        if (!data || !data.friendId) {
            console.error('Invalid load messages request:', data);
            if (callback) callback({ success: false, error: 'Invalid request data' });
            return;
        }
        
        try {
            if (!currentUserId) {
                console.error('Cannot load messages: Socket not authenticated');
                if (callback) callback({ success: false, error: 'Not authenticated' });
                return;
            }
            
            const messages = await PrivateMessage.find({
                $or: [
                    { sender: currentUserId, recipient: data.friendId },
                    { sender: data.friendId, recipient: currentUserId }
                ]
            }).sort({ timestamp: 1 }).limit(data.limit || 50);
            
            const formattedMessages = messages.map(msg => ({
                messageId: msg.messageId,
                text: msg.text,
                timestamp: msg.timestamp,
                senderId: msg.sender.toString(),
                recipientId: msg.recipient.toString(),
                type: msg.sender.toString() === currentUserId ? 'outgoing' : 'incoming',
                status: 'delivered'
            }));
            
            console.log(`Found ${formattedMessages.length} messages between users ${currentUserId} and ${data.friendId}`);
            
            if (callback) {
                callback({
                    success: true,
                    messages: formattedMessages
                });
            }
        } catch (error) {
            console.error('Error loading private messages:', error);
            if (callback) {
                callback({ success: false, error: 'Server error loading messages' });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        if (currentUserId) {
            if (userSocketMap[currentUserId] === socket.id) {
                delete userSocketMap[currentUserId];
            }
        }
    });
});

app.get('/pages/*', (req, res) => {
    const filePath = path.join(__dirname, '../public', req.path);
    res.sendFile(filePath);
});

app.get('/lobby/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/lobby.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/landing.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(notFound);
app.use(errorHandler);

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
