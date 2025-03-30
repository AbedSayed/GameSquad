const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient querying
privateMessageSchema.index({ sender: 1, recipient: 1, timestamp: -1 });
privateMessageSchema.index({ recipient: 1, timestamp: -1 });

const PrivateMessage = mongoose.model('PrivateMessage', privateMessageSchema);

module.exports = PrivateMessage; 