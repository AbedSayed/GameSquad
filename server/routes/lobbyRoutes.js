const express = require('express');
const router = express.Router();
const {
  createLobby,
  getLobbies,
  getLobbyById,
  updateLobby,
  deleteLobby,
  joinLobby,
  leaveLobby,
  toggleReady
} = require('../controllers/lobbyController');
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const Lobby = require('../models/Lobby');

// Public routes
router.get('/', getLobbies);
router.get('/:id', getLobbyById);

// Protected routes
router.post('/', protect, createLobby);
router.put('/:id', protect, updateLobby);
router.delete('/:id', protect, deleteLobby);
router.post('/:id/join', protect, joinLobby);
router.post('/:id/leave', protect, leaveLobby);
router.post('/:id/ready', protect, toggleReady);

// Get messages route with optional authentication
router.get('/:id/messages', async (req, res) => {
  try {
    const lobbyId = req.params.id;
    
    // Check if lobby exists
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ message: 'Lobby not found' });
    }
    
    // Fetch messages for this lobby, sorted by timestamp
    const messages = await Message.find({ lobbyId })
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages for performance
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching lobby messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route - get lobby player status
router.get('/:id/debug', protect, async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id)
      .populate('host', 'username')
      .populate('players.user', 'username');
    
    if (!lobby) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lobby not found' 
      });
    }
    
    // Find the current user in the lobby
    const currentUserId = req.user._id.toString();
    const currentPlayer = lobby.players.find(
      p => p.user._id.toString() === currentUserId
    );
    
    return res.status(200).json({
      success: true,
      debug: {
        lobby: {
          _id: lobby._id,
          name: lobby.name,
          status: lobby.status
        },
        host: {
          _id: lobby.host._id,
          username: lobby.host.username,
          isCurrentUser: lobby.host._id.toString() === currentUserId
        },
        currentPlayer: currentPlayer ? {
          ready: currentPlayer.ready,
          username: currentPlayer.user.username
        } : null,
        isInLobby: !!currentPlayer,
        allPlayers: lobby.players.map(p => ({
          _id: p.user._id,
          username: p.user.username,
          ready: p.ready
        }))
      }
    });
  } catch (error) {
    console.error('Debug route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching debug info',
      error: error.message
    });
  }
});

// Debug fix route - repair any lobbies with invalid status values
router.get('/:id/fix-status', protect, async (req, res) => {
  try {
    const lobby = await Lobby.findById(req.params.id);
    
    if (!lobby) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lobby not found' 
      });
    }
    
    // Check if user is host
    const isHost = lobby.host.toString() === req.user._id.toString();
    if (!isHost) {
      return res.status(403).json({
        success: false,
        message: 'Only the host can fix the lobby'
      });
    }
    
    const originalStatus = lobby.status;
    
    // Fix the lobby status to a valid value if needed
    const validStatuses = ['waiting', 'playing', 'finished'];
    if (!validStatuses.includes(lobby.status)) {
      console.log(`Fixing invalid lobby status: ${lobby.status} -> waiting`);
      lobby.status = 'waiting';
      await lobby.save();
      
      return res.status(200).json({
        success: true,
        message: `Fixed lobby status from "${originalStatus}" to "waiting"`,
        lobby: {
          _id: lobby._id,
          name: lobby.name,
          status: lobby.status
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Lobby status is already valid',
      lobby: {
        _id: lobby._id,
        name: lobby.name,
        status: lobby.status
      }
    });
  } catch (error) {
    console.error('Fix status route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fixing lobby status',
      error: error.message
    });
  }
});

module.exports = router;
