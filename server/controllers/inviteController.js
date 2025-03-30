const Lobby = require('../models/Lobby');
const User = require('../models/User');
const Invite = require('../models/Invite');

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

        // Generate unique ID for the invite
        const inviteId = `inv_${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

        // Create invite object for the database
        const inviteData = {
            sender: sender._id,
            recipient: recipient._id,
            lobbyId: lobby._id,
            status: 'pending',
            message: message || `${sender.username} has invited you to join their lobby!`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        };

        // Check if an invite already exists
        let existingInvite = await Invite.findOne({
            sender: sender._id,
            recipient: recipient._id,
            lobbyId: lobby._id,
            status: 'pending'
        });

        let savedInvite;
        
        if (existingInvite) {
            // Update the existing invite
            existingInvite.message = inviteData.message;
            existingInvite.expiresAt = inviteData.expiresAt;
            existingInvite.status = 'pending';
            savedInvite = await existingInvite.save();
        } else {
            // Create a new invite
            const newInvite = new Invite(inviteData);
            savedInvite = await newInvite.save();
        }

        // Create invite object for the socket event
        const socketInvite = {
            id: inviteId,
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
            status: 'pending',
            _id: savedInvite._id // Include the database ID
        };

        // Socket handling if available
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${recipientId}`).emit('new-invite', socketInvite);
            console.log(`Emitted new-invite event to user:${recipientId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Invitation sent successfully',
            data: socketInvite
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
        // Get the current user ID
        const userId = req.user._id;
        
        // Find all pending invites for this user
        const invites = await Invite.find({ 
            recipient: userId,
            status: 'pending',
            expiresAt: { $gt: new Date() } // Only return non-expired invites
        })
        .populate('sender', 'username')
        .populate('lobbyId', 'name gameType')
        .sort({ createdAt: -1 }); // Newest first
        
        // Format the invites for the client
        const formattedInvites = invites.map(invite => ({
            _id: invite._id,
            id: `inv_${invite._id}`,
            senderId: invite.sender._id,
            senderName: invite.sender.username,
            recipientId: userId,
            lobbyId: invite.lobbyId._id,
            lobbyName: invite.lobbyId.name || 'Game Lobby',
            gameType: invite.lobbyId.gameType || 'Game',
            message: invite.message,
            status: invite.status,
            timestamp: invite.createdAt,
            expiresAt: invite.expiresAt
        }));
        
        res.status(200).json({
            success: true,
            data: formattedInvites,
            invites: formattedInvites // For backward compatibility
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

// @desc    Accept an invite
// @route   POST /api/invites/:id/accept
// @access  Private
const acceptInvite = async (req, res) => {
    try {
        const inviteId = req.params.id;
        const userId = req.user._id;
        
        // Find the invite
        const invite = await Invite.findOne({
            _id: inviteId,
            recipient: userId,
            status: 'pending'
        });
        
        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found or already processed'
            });
        }
        
        // Update the invite status
        invite.status = 'accepted';
        await invite.save();
        
        // Emit socket event if available
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${invite.sender}`).emit('invite-accepted', {
                inviteId: invite._id,
                acceptedBy: userId,
                lobbyId: invite.lobbyId
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Invite accepted successfully',
            lobbyId: invite.lobbyId
        });
    } catch (error) {
        console.error('Error accepting invite:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Decline an invite
// @route   POST /api/invites/:id/decline
// @access  Private
const declineInvite = async (req, res) => {
    try {
        const inviteId = req.params.id;
        const userId = req.user._id;
        
        // Find the invite
        const invite = await Invite.findOne({
            _id: inviteId,
            recipient: userId,
            status: 'pending'
        });
        
        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found or already processed'
            });
        }
        
        // Update the invite status
        invite.status = 'declined';
        await invite.save();
        
        // Emit socket event if available
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${invite.sender}`).emit('invite-declined', {
                inviteId: invite._id,
                declinedBy: userId
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Invite declined successfully'
        });
    } catch (error) {
        console.error('Error declining invite:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Get invite count for the current user
// @route   GET /api/invites/count
// @access  Private
const getInviteCount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Count pending invites
        const count = await Invite.countDocuments({
            recipient: userId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });
        
        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting invite count:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    sendInvite,
    getInvites,
    acceptInvite,
    declineInvite,
    getInviteCount
}; 