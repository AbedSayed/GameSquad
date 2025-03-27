# Gaming Lobby Finder Website

A comprehensive web application that helps gamers find teammates for games like CSGO or Valorant. Users can create accounts, set up profiles with their gaming preferences, create or join lobbies, and chat with other players in real-time.

## Features

### User Authentication System
- Secure registration and login functionality
- JWT-based authentication
- Password hashing with bcrypt
- Session management

### User Profile System
- Game ranks for different games
- Language preferences
- Gaming interests
- Online status tracking
- Profile visibility settings
- Activity history

### Lobby System
- Create lobbies for specific games (up to 5 players)
- Join existing lobbies
- Lobby status tracking (open/full/closed)
- Lobby invitations
- Password protection for private lobbies

### Real-time Chat System
- WebSocket implementation using Socket.io
- Lobby group chat
- Private messaging between users
- Typing indicators
- Online status updates
- Message history

### Search and Filter System
- Search for players by game rank, language, interests, and online status
- Search for lobbies by game, rank, language, and status
- Dynamic filtering options
- Real-time results display

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Socket.io Client

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- Socket.io
- JSON Web Tokens (JWT)
- bcrypt for password hashing

## Project Structure

```
lobby-finder-project/
├── public/                  # Frontend files
│   ├── css/                 # CSS stylesheets
│   ├── js/                  # JavaScript files
│   │   ├── main.js          # Main JavaScript file
│   │   ├── auth.js          # Authentication functions
│   │   ├── profile.js       # Profile management functions
│   │   ├── lobby.js         # Lobby management functions
│   │   ├── chat.js          # Real-time chat functions
│   │   └── search.js        # Search and filter functions
│   ├── pages/               # HTML pages
│   │   ├── login.html       # Login page
│   │   ├── register.html    # Registration page
│   │   ├── profile.html     # User profile page
│   │   ├── lobbies.html     # Lobby browser page
│   │   └── search.html      # Search page
│   └── index.html           # Landing page
├── server/                  # Backend files
│   ├── config/              # Configuration files
│   │   └── db.js            # Database connection
│   ├── controllers/         # Request handlers
│   │   ├── userController.js     # User-related controllers
│   │   ├── profileController.js  # Profile-related controllers
│   │   └── lobbyController.js    # Lobby-related controllers
│   ├── middleware/          # Middleware functions
│   │   └── authMiddleware.js     # Authentication middleware
│   ├── models/              # Database models
│   │   ├── userModel.js     # User model
│   │   ├── profileModel.js  # Profile model
│   │   └── lobbyModel.js    # Lobby model
│   ├── routes/              # API routes
│   │   ├── userRoutes.js    # User-related routes
│   │   ├── profileRoutes.js # Profile-related routes
│   │   └── lobbyRoutes.js   # Lobby-related routes
│   ├── socket/              # WebSocket implementation
│   │   └── socketServer.js  # Socket.io server
│   └── server.js            # Main server file
├── .env                     # Environment variables
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## Installation and Setup

1. Clone the repository
```
git clone https://github.com/yourusername/lobby-finder-project.git
cd lobby-finder-project
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

4. Start the server
```
npm start
```

5. Open your browser and navigate to `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/users` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Profiles
- `POST /api/profiles` - Create or update profile (protected)
- `GET /api/profiles/me` - Get current user's profile (protected)
- `GET /api/profiles/user/:userId` - Get profile by user ID
- `PUT /api/profiles/gameranks` - Add game rank (protected)
- `DELETE /api/profiles/gameranks/:game` - Remove game rank (protected)

### Lobbies
- `POST /api/lobbies` - Create a new lobby (protected)
- `GET /api/lobbies` - Get all lobbies
- `GET /api/lobbies/:id` - Get lobby by ID
- `PUT /api/lobbies/:id` - Update lobby (protected)
- `DELETE /api/lobbies/:id` - Delete lobby (protected)
- `POST /api/lobbies/:id/join` - Join lobby (protected)
- `POST /api/lobbies/:id/leave` - Leave lobby (protected)
- `POST /api/lobbies/:id/invite` - Invite user to lobby (protected)
- `POST /api/lobbies/:id/messages` - Add message to lobby chat (protected)

## WebSocket Events

### Connection Events
- `connect` - Client connected to server
- `disconnect` - Client disconnected from server

### User Events
- `onlineUsers` - List of online users
- `userStatusChanged` - User status update

### Lobby Events
- `joinLobby` - Join a lobby
- `leaveLobby` - Leave a lobby
- `lobbyChatMessage` - Send message to lobby chat
- `newLobbyChatMessage` - New message in lobby chat
- `userJoinedLobby` - User joined lobby
- `userLeftLobby` - User left lobby

### Private Chat Events
- `privateMessage` - Send private message
- `newPrivateMessage` - New private message received

### Typing Indicators
- `lobbyTyping` - User typing in lobby chat
- `privateTyping` - User typing in private chat
- `userTyping` - Typing indicator update

## Future Enhancements

- Voice chat integration
- Team/clan creation and management
- Tournament organization
- Integration with game APIs for automatic rank updates
- Advanced matchmaking algorithms
- Mobile app version

## License

This project is licensed under the MIT License - see the LICENSE file for details.
