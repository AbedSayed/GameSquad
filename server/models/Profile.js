const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  avatar: {
    type: String
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  level: {
    type: Number
  },
  experience: {
    type: Number
  },
  gamesPlayed: {
    type: Number
  },
  wins: {
    type: Number
  },
  losses: {
    type: Number
  },
  rank: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
  },
  // Game-specific ranks
  gameRanks: [{
    game: String,
    rank: String
  }],
  // Languages the user speaks
  languages: [String],
  // Gaming interests
  interests: [String],
  // Friends list - references to User model
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // User preferences - only include if explicitly set
  preferences: {
    playStyle: {
      type: String,
      enum: ['Casual', 'Competitive', 'Semi-Competitive']
    },
    communication: {
      type: String,
      enum: ['Text Chat', 'Voice Chat', 'Both', 'None']
    },
    playTime: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night', 'Weekends', 'Flexible']
    },
    region: {
      type: String,
      enum: ['North America', 'Europe', 'Asia', 'South America', 'Oceania', 'Africa', 'Middle East']
    }
  },
  isOnline: {
    type: Boolean
  },
  // Achievements
  achievements: [{
    name: String,
    description: String,
    date: Date
  }]
}, {
  timestamps: true,
  // Only include fields that have been set
  minimize: true,
  // Skip validation for undefined fields
  validateBeforeSave: false
});

// Virtual for win rate
profileSchema.virtual('winRate').get(function() {
  if (!this.gamesPlayed || this.gamesPlayed === 0) return 0;
  return (this.wins / this.gamesPlayed * 100).toFixed(2);
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile; 