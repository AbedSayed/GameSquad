const express = require('express');
const router = express.Router();
const { 
    sendInvite, 
    getInvites,
    acceptInvite,
    declineInvite,
    getInviteCount
} = require('../controllers/inviteController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes
router.post('/send', protect, sendInvite);
router.get('/', protect, getInvites);
router.post('/:id/accept', protect, acceptInvite);
router.post('/:id/decline', protect, declineInvite);
router.get('/count', protect, getInviteCount);

module.exports = router; 