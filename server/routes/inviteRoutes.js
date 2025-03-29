const express = require('express');
const router = express.Router();
const { 
    sendInvite, 
    getInvites
} = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes
router.post('/send', protect, sendInvite);
router.get('/', protect, getInvites);

module.exports = router; 