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

## Implementation Details

### Authentication System Implementation
- JWT (JSON Web Token) authentication flow with token generation and validation
- Secure password hashing using bcrypt with salt rounds for enhanced security
- Middleware-based route protection for authenticated endpoints
- Token-based session management with refresh capabilities
- Persistent login state maintained through localStorage

### Profile System Implementation
- MongoDB schema for user profiles with embedded game ranks
- RESTful API endpoints for CRUD operations on profile data
- Game ranks stored as an array of objects with game name and rank fields
- Profile data persistence between sessions
- User preferences saved as structured objects
- Profile image handling with URL storage
- Language and interests stored as string arrays for efficient filtering

### Game Ranks Implementation
- MongoDB schema supports multiple game ranks per user
- CRUD operations for managing game ranks:
  - Adding new game ranks (`PUT /api/profiles/gameranks`)
  - Removing existing game ranks (`DELETE /api/profiles/gameranks/:game`)
  - Updating game ranks with the same game name
- Conflict resolution for duplicate game entries
- UI components for displaying and editing game ranks
- Server-side validation for game rank data

### Lobby System Implementation
- Real-time lobby status updates using Socket.io
- Lobby persistence in MongoDB with reference to creator
- Player management within lobbies (join/leave operations)
- Invitation system for inviting friends to lobbies
- Lobby filtering based on game, region, and status
- Dedicated chat rooms for each lobby

### Real-time Communication Implementation
- Socket.io for WebSocket-based real-time communication
- Private messaging between users with persistent message history
- Lobby chat rooms with real-time updates
- Socket authentication using JWT tokens
- Reconnection handling with automatic retry mechanisms
- Error handling for socket connection issues
- Fallback mechanisms for loading Socket.IO library
- Cross-browser compatibility for WebSocket connections

### User Interface Components
- Responsive design using CSS Grid and Flexbox
- Dynamic content loading without page refreshes
- Real-time updates for UI elements based on socket events
- Form handling with validation feedback
- Notification system for important events
- Dark-themed gaming interface with neon accents

### Data Management
- MongoDB for persistent data storage
- Mongoose ODM for schema validation and query building
- RESTful API architecture for data operations
- Socket.io for real-time data synchronization
- Client-side data caching for performance optimization
- Error handling with appropriate HTTP status codes

## Future Enhancements

- Voice chat integration
- Team/clan creation and management
- Tournament organization
- Integration with game APIs for automatic rank updates
- Advanced matchmaking algorithms
- Mobile app version
