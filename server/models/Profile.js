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
    type: String,
    default: 'default-avatar.png'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    default: 'Bronze'
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
  // User preferences
  preferences: {
    playStyle: {
      type: String,
      enum: ['Casual', 'Competitive', 'Semi-Competitive'],
      default: 'Casual'
    },
    communication: {
      type: String,
      enum: ['Text Chat', 'Voice Chat', 'Both', 'None'],
      default: 'Both'
    },
    playTime: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night', 'Weekends', 'Flexible'],
      default: 'Evening'
    },
    region: {
      type: String,
      enum: ['North America', 'Europe', 'Asia', 'South America', 'Oceania', 'Africa', 'Middle East'],
      default: 'North America'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    privacyLevel: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark'
    }
  },
  achievements: [{
    name: String,
    description: String,
    dateUnlocked: Date
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for win rate
profileSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0;
  return (this.wins / this.gamesPlayed * 100).toFixed(2);
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile; 