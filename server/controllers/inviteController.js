const Lobby = require('../models/Lobby');
const User = require('../models/User');

// @desc    Send an invite to a user for a lobby
// @route   POST /api/invites/send
// @access  Private
const sendInvite = async (req, res) => {
    try {
        const { 
            recipientId, 
            recipientName, 
            lobbyId, 
            lobbyName, 
            gameType,
            message 
        } = req.body;

        if (!recipientId || !lobbyId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Recipient ID and Lobby ID are required' 
            });
        }

        // Get sender info from the authenticated user
        const sender = req.user;

        // Check if lobby exists
        const lobby = await Lobby.findById(lobbyId);
        if (!lobby) {
            return res.status(404).json({ 
                success: false, 
                message: 'Lobby not found' 
            });
        }

        // Check if user is in this lobby (either as host or player)
        const isHost = lobby.host.toString() === sender._id.toString();
        const isPlayer = lobby.players.some(player => 
            player.user.toString() === sender._id.toString()
        );

        if (!isHost && !isPlayer) {
            return res.status(403).json({ 
                success: false, 
                message: 'You must be a member of this lobby to send invites' 
            });
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ 
                success: false, 
                message: 'Recipient not found' 
            });
        }

        // Check if lobby is full
        if (lobby.currentPlayers >= lobby.maxPlayers) {
            return res.status(400).json({ 
                success: false, 
                message: 'Lobby is full' 
            });
        }

        // Create invite object
        const invite = {
            id: `inv_${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
            senderId: sender._id,
            senderName: sender.username,
            recipientId: recipient._id,
            recipientName: recipient.username || recipientName,
            type: 'lobby_invite',
            lobbyId: lobby._id,
            lobbyName: lobby.name || lobbyName,
            gameType: lobby.gameType || gameType,
            message: message || `${sender.username} has invited you to join their lobby!`,
            timestamp: new Date(),
            status: 'pending'
        };

        // Socket handling if available
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${recipientId}`).emit('new-invite', invite);
            console.log(`Emitted new-invite event to user:${recipientId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Invitation sent successfully',
            data: invite
        });
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// @desc    Get all invites for the current user
// @route   GET /api/invites
// @access  Private
const getInvites = async (req, res) => {
    try {
        // In a real implementation, this would query the database
        // For now, we'll just return an empty array since we're using localStorage
        res.status(200).json({
            success: true,
            data: []
        });
    } catch (error) {
        console.error('Error getting invites:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

module.exports = {
    sendInvite,
    getInvites
}; 