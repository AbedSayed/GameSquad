const mongoose = require('mongoose');

const lobbySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Lobby name is required'],
    trim: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting'
  },
  maxPlayers: {
    type: Number,
    default: 2,
    min: [2, 'Minimum 2 players required'],
    max: [10, 'Maximum 10 players allowed']
  },
  currentPlayers: {
    type: Number,
    default: 1
  },
  gameType: {
    type: String,
    default: 'standard'
  },
  rank: {
    type: String,
    default: 'Any'
  },
  language: {
    type: String,
    default: 'Any'
  },
  region: {
    type: String,
    default: 'Any'
  },
  password: {
    type: String,
    select: false // Don't include password in queries by default
  },
  players: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ready: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for messages
lobbySchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'lobbyId'
});

// Index for faster queries
lobbySchema.index({ status: 1, gameType: 1 });

// Virtual for checking if lobby is full
lobbySchema.virtual('isFull').get(function() {
  return this.currentPlayers >= this.maxPlayers;
});

const Lobby = mongoose.model('Lobby', lobbySchema);

module.exports = Lobby;