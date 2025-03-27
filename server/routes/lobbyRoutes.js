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

module.exports = router;
