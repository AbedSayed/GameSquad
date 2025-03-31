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

// Socket handlers
const setupSocketHandlers = require('./socket/socketHandlers');
setupSocketHandlers(io, userSocketMap);

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
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Access the application at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to the database:', error);
        process.exit(1);
    });
