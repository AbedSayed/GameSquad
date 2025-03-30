const { User, Profile } = require('../models');
const Lobby = require('../models/Lobby');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key-here', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  // Check if user exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    res.status(400);
    throw new Error(
      userExists.email === email 
        ? 'User with this email already exists' 
        : 'Username is already taken'
    );
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    friends: [],
    friendRequests: { sent: [], received: [] }
  });

  if (user) {
    // Create an empty profile for the user
    const profile = await Profile.create({
      user: user._id,
      displayName: username,
      bio: '',
      avatar: '',
      level: 1,
      reputation: 0,
      gameRanks: [],
      languages: [],
      interests: [],
      preferences: {
        notifications: true,
        privacyLevel: 'public',
        theme: 'dark',
      },
      socialLinks: {},
      isOnline: false,
      lastOnline: new Date(),
      recentActivity: [],
    });

    // Update the user with the profile reference
    user.profile = profile._id;
    await user.save();

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends,
      friendRequests: user.friendRequests,
      token: generateToken(user._id),
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email and password are provided
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide both email and password');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error('Please provide a valid email address');
  }

  // Check for user email
  const user = await User.findOne({ email }).populate('friends', 'username email');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if password matches
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  console.log('Login successful for user:', user.username);
  console.log('User friends:', user.friends);

  // Authentication successful
  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    friends: user.friends || [],
    friendRequests: user.friendRequests || { sent: [], received: [] },
    token: generateToken(user._id),
    isAdmin: user.isAdmin,
  });
});

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  try {
    console.log('Getting user data for ID:', req.user.id);
    
    // Get user without population to avoid schema errors
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // If user has friends, get basic info for them
    let friendsData = [];
    if (user.friends && user.friends.length > 0) {
      console.log(`User has ${user.friends.length} friends, fetching basic info`);
      const friendIds = user.friends.map(id => id.toString());
      
      // Fetch basic info for each friend
      friendsData = await User.find({ 
        _id: { $in: friendIds } 
      }).select('username email');
    }
    
    console.log('User found with friends:', friendsData.length);
    
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends || [], // Keep the original IDs for reference
      friendsData: friendsData, // Add the fetched friend data
      friendRequests: user.friendRequests || { sent: [], received: [] },
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user._id)
      .select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update basic info
      user.displayName = req.body.displayName || user.displayName;
      user.email = req.body.email || user.email;
      
      // Update profile picture if provided
      if (req.body.profilePic) {
        user.profilePic = req.body.profilePic;
      }
      
      // Update profile visibility if provided
      if (req.body.profileVisibility) {
        user.profileVisibility = req.body.profileVisibility;
      }
      
      // Update password if provided
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        profilePic: updatedUser.profilePic,
        profileVisibility: updatedUser.profileVisibility,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update user online status
// @route   PUT /api/users/status
// @access  Private
const updateUserStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.onlineStatus = status;
      await user.save();
      
      res.json({ status: user.onlineStatus });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = asyncHandler(async (req, res) => {
  try {
    // Get query parameters for filtering
    const { game, rank, language, interest, status } = req.query;
    
    // Build filter object
    const filter = {
      profileVisibility: 'public'
    };
    
    // Add online status filter if provided
    if (status) {
      filter.onlineStatus = status;
    }
    
    // Find users matching filter
    const users = await User.find(filter)
      .select('-password')
      .populate('profile');
    
    // Apply additional filters that require checking nested fields
    let filteredUsers = users;
    
    if (game || rank || language || interest) {
      filteredUsers = users.filter(user => {
        const profile = user.profile;
        if (!profile) return false;
        
        // Game and rank filter
        if (game && rank) {
          const hasGameRank = profile.gameRanks?.some(gr => gr.game === game && gr.rank === rank);
          if (!hasGameRank) return false;
        } else if (game) {
          const hasGame = profile.gameRanks?.some(gr => gr.game === game);
          if (!hasGame) return false;
        } else if (rank) {
          const hasRank = profile.gameRanks?.some(gr => gr.rank === rank);
          if (!hasRank) return false;
        }
        
        // Language filter
        if (language && !profile.languages?.includes(language)) {
          return false;
        }
        
        // Interest filter
        if (interest && !profile.interests?.includes(interest)) {
          return false;
        }
        
        return true;
      });
    }
    
    res.json(filteredUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('profile');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all users
// @route   GET /api/users/all
// @access  Public
const getAllUsers = asyncHandler(async (req, res) => {
    console.log('getAllUsers endpoint hit');
    try {
        // First, check if there are any users in the database
        const userCount = await User.countDocuments();
        console.log('Total users in database:', userCount);

        // Find all users and populate profiles
        const users = await User.find({})
            .select('username email createdAt profile')
            .lean();
        
        console.log('Found users:', users.length);
        
        // Fetch profiles separately to ensure we get data even if population fails
        const userIds = users.map(user => user._id);
        const profiles = await Profile.find({ user: { $in: userIds } }).lean();
        
        // Create a map of profiles by user ID for easier lookup
        const profileMap = profiles.reduce((map, profile) => {
            map[profile.user.toString()] = profile;
            return map;
        }, {});
        
        // Combine user data with profile data
        const response = users.map(user => {
            // Use profile from map if available or populate from reference
            const userProfile = profileMap[user._id.toString()] || 
                               (user.profile ? { _id: user.profile } : null);
                               
            return {
                _id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
                profile: userProfile
            };
        });
        
        console.log('Sending response with users');
        res.json(response);
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Create a test user for development
// @route   POST /api/users/create-test
// @access  Public
const createTestUser = asyncHandler(async (req, res) => {
  try {
    // Test user data
    const testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123'
    };
    
    // Check if test user already exists
    const userExists = await User.findOne({ email: testUser.email });

    if (userExists) {
      // Delete existing test user
      await User.deleteOne({ email: testUser.email });
      
      // Delete existing profile if it exists
      if (userExists.profile) {
        await Profile.deleteOne({ _id: userExists.profile });
      }
    }

    // Create user
    const user = await User.create({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password  // The model will hash this automatically
    });

    if (user) {
      // Create profile for user
      const profile = await Profile.create({
        user: user._id,
        displayName: testUser.username,
        bio: 'This is a test user account for development and testing.',
        level: 5,
        experience: 1000,
        isOnline: true
      });

      // Update user with profile reference
      user.profile = profile._id;
      await user.save();

      res.status(201).json({
        message: 'Test user created successfully',
        credentials: {
          email: testUser.email,
          password: testUser.password
        }
      });
    } else {
      res.status(400);
      throw new Error('Failed to create test user');
    }
  } catch (error) {
    console.error('Test user creation error:', error);
    res.status(500).json({ 
      message: 'Error creating test user', 
      error: error.message 
    });
  }
});

// @desc    Send lobby invitation
// @route   POST /api/users/invite/:userId/lobby/:lobbyId
// @access  Private
const inviteToLobby = asyncHandler(async (req, res) => {
  try {
    const { userId, lobbyId } = req.params;
    
    // Check if the user exists
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if the lobby exists
    const lobby = await Lobby.findById(lobbyId);
    if (!lobby) {
      return res.status(404).json({
        success: false,
        message: 'Lobby not found'
      });
    }
    
    // Check if the requester is the host of the lobby
    if (lobby.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the lobby host can send invitations'
      });
    }
    
    // Check if user is already in the lobby
    const isAlreadyInLobby = lobby.players.some(player => 
      player.user.toString() === userId
    );
    
    if (isAlreadyInLobby) {
      return res.status(400).json({
        success: false,
        message: 'User is already in the lobby'
      });
    }
    
    // Create invitation in database
    // This would normally be stored in an Invitations collection
    // For this example, we'll just return success
    
    // In a real system, this would trigger a notification to the user
    // Either through WebSockets or by storing in a notifications collection
    
    res.status(200).json({
      success: true,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get user's lobbies (both hosting and joined)
// @route   GET /api/users/lobbies
// @access  Private
const getUserLobbies = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Getting lobbies for user:', userId);

    // Get all lobbies where user is either host or a player
    const lobbies = await Lobby.find({
      $or: [
        { host: userId },
        { 'players.user': userId }
      ]
    }).populate('host', 'username').populate('players.user', 'username');

    console.log(`Found ${lobbies.length} lobbies for this user`);

    res.status(200).json({
      success: true,
      data: lobbies
    });
  } catch (error) {
    console.error('Error fetching user lobbies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user lobbies',
      error: error.message
    });
  }
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateUserStatus,
  getUsers,
  getUserById,
  getMe,
  getAllUsers,
  createTestUser,
  inviteToLobby,
  getUserLobbies
};
