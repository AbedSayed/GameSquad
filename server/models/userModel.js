const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
    },
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    friendRequests: {
      sent: [{
        _id: mongoose.Schema.Types.ObjectId,
        recipient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }],
      received: [{
        _id: mongoose.Schema.Types.ObjectId,
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
); 