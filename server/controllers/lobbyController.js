const { User, Profile, Lobby } = require('../models');
const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');

// @desc    Create a new lobby
// @route   POST /api/lobbies
// @access  Private
const createLobby = asyncHandler(async (req, res) => {
  const { name, maxPlayers, gameType, password } = req.body;
  const userId = req.user._id;

  const lobby = await Lobby.create({
    name,
    host: userId,
    maxPlayers: parseInt(maxPlayers),
    gameType,
    password,
    status: 'waiting',
    players: [{ user: userId, ready: false }],
    currentPlayers: 1
  });

  const populatedLobby = await lobby.populate([
    { path: 'host', select: 'username' },
    { path: 'players.user', select: 'username' }
  ]);

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
  const lobby = await Lobby.findById(req.params.id);
  const userId = req.user._id;

  if (!lobby) {
    res.status(404);
    throw new Error('Lobby not found');
  }

  // Check if user is the host
  if (lobby.host.toString() === userId.toString()) {
    res.status(400);
    throw new Error('You are the host of this lobby');
  }

  // Check if user is already in the lobby
  if (lobby.players.some(player => player.user.toString() === userId.toString())) {
    res.status(400);
    throw new Error('You are already in this lobby');
  }

  // Check if lobby is full
  if (lobby.currentPlayers >= lobby.maxPlayers) {
    res.status(400);
    throw new Error('Lobby is full');
  }

  // Add player to lobby
  lobby.players.push({ user: userId, ready: false });
  lobby.currentPlayers += 1;

  // Update lobby status if needed
  if (lobby.currentPlayers === lobby.maxPlayers) {
    lobby.status = 'full';
  }

  await lobby.save();

  // Populate the updated lobby
  const updatedLobby = await Lobby.findById(lobby._id)
    .populate('host', 'username')
    .populate('players.user', 'username');

  // Emit socket event for real-time updates
  req.app.get('io').to(lobby._id.toString()).emit('playerJoined', {
    lobby: updatedLobby,
    player: {
      _id: req.user._id,
      username: req.user.username
    }
  });

  res.status(200).json({
    success: true,
    data: updatedLobby
  });
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

    // Check if all players are ready
    const allReady = lobby.players.every(p => p.ready);
    if (allReady && lobby.currentPlayers >= 2) {
        lobby.status = 'starting';
    } else {
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
