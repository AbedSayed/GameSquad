const mongoose = require('mongoose');

// Invite Schema
const inviteSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lobbyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lobby',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  message: {
    type: String,
    default: 'You have been invited to join a lobby!'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index to ensure uniqueness
inviteSchema.index({ sender: 1, recipient: 1, lobbyId: 1 }, { unique: true });

const Invite = mongoose.model('Invite', inviteSchema);

module.exports = Invite; 