const { User, Profile, Lobby } = require('../models');
const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');

// @desc    Create a new lobby
// @route   POST /api/lobbies
// @access  Private
const createLobby = asyncHandler(async (req, res) => {
  const { name, maxPlayers, gameType, password, rank, language, region } = req.body;
  const userId = req.user._id;

  console.log('Creating lobby with data:', { name, maxPlayers, gameType, rank, language, region });
  
  const lobby = await Lobby.create({
    name,
    host: userId,
    maxPlayers: parseInt(maxPlayers),
    gameType,
    password,
    rank: rank === undefined || rank === '' ? 'any' : rank,
    language: language === undefined || language === '' ? 'any' : language, 
    region: region === undefined || region === '' ? 'any' : region,
    status: 'waiting',
    players: [{ user: userId, ready: false }],
    currentPlayers: 1
  });

  const populatedLobby = await lobby.populate([
    { path: 'host', select: 'username' },
    { path: 'players.user', select: 'username' }
  ]);

  console.log('Created lobby:', populatedLobby);

  res.status(201).json({
    success: true,
    data: populatedLobby
  });
});

// @desc    Get all lobbies
// @route   GET /api/lobbies
// @access  Public
const getLobbies = asyncHandler(async (req, res) => {
  console.log('GET /api/lobbies request received');
  try {
    // Log the filter parameters
    console.log('Filter params:', req.query);
    
    // Build the filter object based on query parameters
    const filter = {}; // Start with empty filter
    
    // Only add status filter if specifically requested
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.game) {
      // Use case-insensitive regex for game type matching
      filter.gameType = new RegExp('^' + req.query.game + '$', 'i');
      console.log('Game filter:', filter.gameType);
    }
    
    if (req.query.rank) {
      filter.minRank = req.query.rank;
    }
    
    if (req.query.language) {
      filter.language = req.query.language;
    }
    
    // Log the final filter being used
    console.log('Using filter:', JSON.stringify(filter));
    
    const lobbies = await Lobby.find(filter)
      .populate('host players.user', 'username')
      .select('-password');
    
    console.log(`Found ${lobbies.length} lobbies`);
    
    // If no lobbies found, log some debug info from the database
    if (lobbies.length === 0) {
      // Get total count of lobbies to see if any exist
      const totalCount = await Lobby.countDocuments({});
      console.log(`Total lobbies in database: ${totalCount}`);
      
      if (totalCount > 0) {
        // Get a sample of gameType values to help debug
        const sampleLobbies = await Lobby.find({}).limit(5).select('gameType');
        console.log('Sample game types in database:', sampleLobbies.map(l => l.gameType));
      }
    }
    
    // Return standardized response format
    res.status(200).json({
      success: true,
      data: lobbies
    });
  } catch (error) {
    console.error('Error in getLobbies controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while retrieving lobbies'
    });
  }
});

// @desc    Get lobby by ID
// @route   GET /api/lobbies/:id
// @access  Public
const getLobbyById = asyncHandler(async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id)
      .populate('host players.user', 'username')
      .select('-password');

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    res.status(200).json({
      success: true,
      data: lobby
    });
  } catch (error) {
    console.error('Error getting lobby:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting lobby'
    });
  }
});

// @desc    Update lobby
// @route   PUT /api/lobbies/:id
// @access  Private
const updateLobby = asyncHandler(async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id);

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    if (lobby.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this lobby'
      });
    }

    const updatedLobby = await Lobby.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('host players.user', 'username');

    res.status(200).json({
      success: true,
      data: updatedLobby
    });
  } catch (error) {
    console.error('Error updating lobby:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating lobby'
    });
  }
});

// @desc    Delete lobby
// @route   DELETE /api/lobbies/:id
// @access  Private
const deleteLobby = asyncHandler(async (req, res) => {
  const lobby = await Lobby.findById(req.params.id);

  if (!lobby) {
    res.status(404);
    throw new Error('Lobby not found');
  }

  // Check ownership - only host can delete
  if (lobby.host.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the lobby host can delete the lobby');
  }

  // Delete all messages related to this lobby
  await Message.deleteMany({ lobbyId: lobby._id });

  // Delete the lobby using deleteOne() instead of remove()
  await Lobby.deleteOne({ _id: lobby._id });

  res.status(200).json({
    success: true,
    message: 'Lobby deleted along with all chat messages',
    data: {}
  });
});

// @desc    Join lobby
// @route   POST /api/lobbies/:id/join
// @access  Private
const joinLobby = asyncHandler(async (req, res) => {
  try {
    console.log('Join lobby request received for lobby ID:', req.params.id);
    console.log('User ID trying to join:', req.user._id);
    
    const lobby = await Lobby.findById(req.params.id);
    console.log('Found lobby:', lobby ? 'Yes' : 'No');
    
    if (lobby) {
      console.log('Lobby details:', {
        id: lobby._id,
        name: lobby.name,
        currentPlayers: lobby.currentPlayers,
        maxPlayers: lobby.maxPlayers,
        playersCount: lobby.players.length,
        status: lobby.status
      });
    }
    
    const userId = req.user._id;

    if (!lobby) {
      res.status(404);
      throw new Error('Lobby not found');
    }

    // Check if user is the host
    const isHost = lobby.host.toString() === userId.toString();
    console.log('Is user the host?', isHost);
    
    if (isHost) {
      res.status(400);
      throw new Error('You are the host of this lobby');
    }

    // Check if user is already in the lobby
    const isAlreadyInLobby = lobby.players.some(player => player.user.toString() === userId.toString());
    console.log('Is user already in the lobby?', isAlreadyInLobby);
    
    if (isAlreadyInLobby) {
      res.status(400);
      throw new Error('You are already in this lobby');
    }

    // Check if lobby is full
    const isFull = lobby.currentPlayers >= lobby.maxPlayers;
    console.log('Is lobby full?', isFull, 'Current players:', lobby.currentPlayers, 'Max players:', lobby.maxPlayers);
    
    if (isFull) {
      res.status(400);
      throw new Error('Lobby is full');
    }

    // Add player to lobby
    console.log('Adding player to lobby');
    lobby.players.push({ user: userId, ready: false });
    
    // Ensure currentPlayers matches the actual number of players
    lobby.currentPlayers = lobby.players.length;
    console.log('New currentPlayers count:', lobby.currentPlayers, 'Players array length:', lobby.players.length);

    // Only update status to "playing" if ALL players are ready, not just because it's full
    if (lobby.currentPlayers === lobby.maxPlayers) {
      console.log('Lobby is now full, but keeping status as "waiting" until all players are ready');
      // Check if all players are ready
      const allPlayersReady = lobby.players.every(player => player.ready);
      if (allPlayersReady) {
        console.log('All players are ready, updating status to playing');
        lobby.status = 'playing';
      } else {
        console.log('Not all players are ready yet, maintaining status as waiting');
      }
    }

    console.log('Saving lobby...');
    await lobby.save();
    console.log('Lobby saved successfully');

    // Populate the updated lobby
    console.log('Populating lobby with user details...');
    const updatedLobby = await Lobby.findById(lobby._id)
      .populate('host', 'username')
      .populate('players.user', 'username');
    console.log('Lobby populated successfully');

    // Emit socket event for real-time updates
    console.log('Emitting socket event...');
    try {
      const io = req.app.get('io');
      if (!io) {
        console.error('Socket.io instance not found on req.app');
      } else {
        console.log('Socket.io instance found, attempting to emit to room:', lobby._id.toString());
        
        // Get socket id if available
        let socketId = 'server-generated';
        if (req.socket) {
          socketId = req.socket.id;
        }
        
        io.to(lobby._id.toString()).emit('user-joined', {
          message: 'New player joined the lobby',
          socketId: socketId,
          timestamp: new Date(),
          lobby: updatedLobby,
          player: {
            _id: req.user._id,
            username: req.user.username
          }
        });
        console.log('Socket event emitted successfully');
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
      // Continue execution, don't fail the request due to socket issues
    }

    console.log('Join lobby successful');
    res.status(200).json({
      success: true,
      data: updatedLobby
    });
  } catch (error) {
    console.error('Error in joinLobby controller:', error);
    
    // If we haven't already set a status code
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    
    throw error;
  }
});

// @desc    Leave lobby
// @route   POST /api/lobbies/:id/leave
// @access  Private
const leaveLobby = asyncHandler(async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id);
    const userId = req.user._id;

    if (!lobby) {
      return res.status(404).json({
        success: false,
        error: 'Lobby not found'
      });
    }

    lobby.players = lobby.players.filter(player => player.user.toString() !== userId.toString());
    lobby.currentPlayers = lobby.players.length;

    if (lobby.players.length === 0) {
      await lobby.deleteOne();
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Lobby deleted'
      });
    }

    if (lobby.host.toString() === userId.toString()) {
      lobby.host = lobby.players[0].user;
    }

    await lobby.save();
    const populatedLobby = await lobby.populate('host players.user', 'username');

    res.status(200).json({
      success: true,
      data: populatedLobby
    });
  } catch (error) {
    console.error('Error leaving lobby:', error);
    res.status(500).json({
      success: false,
      error: 'Error leaving lobby'
    });
  }
});

// @desc    Get messages for a lobby
// @route   GET /api/lobbies/:id/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  res.json({ messages: [] });
});

// @desc    Add message to lobby
// @route   POST /api/lobbies/:id/messages
// @access  Private
const addMessage = asyncHandler(async (req, res) => {
  res.json({ message: 'Message added' });
});

// @desc    Invite user to lobby
// @route   POST /api/lobbies/:id/invite
// @access  Private
const inviteToLobby = asyncHandler(async (req, res) => {
  res.json({ message: 'Invitation sent' });
});

// @desc    Respond to lobby invitation
// @route   POST /api/lobbies/:id/respond
// @access  Private
const respondToInvitation = asyncHandler(async (req, res) => {
  res.json({ message: 'Response recorded' });
});

// @desc    Get user's lobbies
// @route   GET /api/lobbies/user/mylobbies
// @access  Private
const getMyLobbies = asyncHandler(async (req, res) => {
  try {
    const lobbies = await Lobby.find({
      'players.user': req.user._id
    }).populate('host players.user', 'username');

    res.status(200).json({
      success: true,
      data: lobbies
    });
  } catch (error) {
    console.error('Error getting user lobbies:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting user lobbies'
    });
  }
});

// @desc    Get user's invitations
// @route   GET /api/lobbies/user/invitations
// @access  Private
const getMyInvitations = asyncHandler(async (req, res) => {
  res.json({ invitations: [] });
});

// @desc    Toggle player ready state
// @route   POST /api/lobbies/:id/ready
// @access  Private
const toggleReady = asyncHandler(async (req, res) => {
    const lobby = await Lobby.findById(req.params.id);
    const userId = req.user._id;

    if (!lobby) {
        res.status(404);
        throw new Error('Lobby not found');
    }

    // Find the player in the lobby
    const playerIndex = lobby.players.findIndex(
        p => p.user.toString() === userId.toString()
    );

    if (playerIndex === -1) {
        res.status(400);
        throw new Error('You are not in this lobby');
    }

    // Toggle ready state
    lobby.players[playerIndex].ready = !lobby.players[playerIndex].ready;

    // Check if all players are ready and lobby is full
    const allReady = lobby.players.every(p => p.ready);
    const isFull = lobby.currentPlayers === lobby.maxPlayers;
    
    if (allReady && isFull) {
        console.log('All players are ready and lobby is full, updating status to playing');
        lobby.status = 'playing';
    } else if (allReady && lobby.currentPlayers >= 2) {
        console.log('All players are ready but lobby is not full, updating status to starting');
        lobby.status = 'starting';
    } else {
        console.log('Not all players are ready, setting status to waiting');
        lobby.status = 'waiting';
    }

    await lobby.save();

    // Populate the updated lobby
    const updatedLobby = await Lobby.findById(lobby._id)
        .populate('host', 'username')
        .populate('players.user', 'username');

    // Emit socket event for real-time updates
    req.app.get('io').to(lobby._id.toString()).emit('playerReady', {
        lobby: updatedLobby,
        player: {
            _id: req.user._id,
            username: req.user.username,
            ready: lobby.players[playerIndex].ready
        }
    });

    res.status(200).json({
        success: true,
        data: updatedLobby
    });
});

module.exports = {
  createLobby,
  getLobbies,
  getLobbyById,
  updateLobby,
  deleteLobby,
  joinLobby,
  leaveLobby,
  inviteToLobby,
  respondToInvitation,
  addMessage,
  getMessages,
  getMyLobbies,
  getMyInvitations,
  toggleReady
};
