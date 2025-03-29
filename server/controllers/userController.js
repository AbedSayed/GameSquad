const { User, Profile } = require('../models');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const bcrypt = require('bcrypt');

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

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends || [],
      friendRequests: user.friendRequests || { sent: [], received: [] },
      token: generateToken(user._id),
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      friends: user.friends || [],
      friendRequests: user.friendRequests || { sent: [], received: [] },
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
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

// @desc    Add friend
// @route   POST /api/users/friends/add/:id
// @access  Private
const addFriend = asyncHandler(async (req, res) => {
  try {
    // Check if the user exists
    const friendId = req.params.id;
    const friend = await User.findById(friendId);
    
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if trying to add self
    if (req.user._id.toString() === friendId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a friend'
      });
    }
    
    // Get profiles
    const userProfile = await Profile.findOne({ user: req.user._id });
    const friendProfile = await Profile.findOne({ user: friendId });
    
    if (!userProfile || !friendProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    // Check if already friends
    if (userProfile.friends.includes(friendId)) {
      return res.status(400).json({
        success: false,
        message: 'This user is already in your friend list'
      });
    }
    
    // Add friend to both profiles
    userProfile.friends.push(friendId);
    await userProfile.save();
    
    friendProfile.friends.push(req.user._id);
    await friendProfile.save();
    
    res.status(200).json({
      success: true,
      message: 'Friend added successfully'
    });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get friend list
// @route   GET /api/users/friends
// @access  Private
const getFriends = asyncHandler(async (req, res) => {
  try {
    // Get user profile with populated friends
    const userProfile = await Profile.findOne({ user: req.user._id })
      .populate({
        path: 'friends',
        select: 'username email',
        populate: {
          path: 'profile',
          select: 'displayName avatar bio isOnline level'
        }
      });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: userProfile.friends
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Remove friend
// @route   DELETE /api/users/friends/:id
// @access  Private
const removeFriend = asyncHandler(async (req, res) => {
  try {
    const friendId = req.params.id;
    
    // Get profiles
    const userProfile = await Profile.findOne({ user: req.user._id });
    const friendProfile = await Profile.findOne({ user: friendId });
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'Your profile not found'
      });
    }
    
    // Remove from user's friends list
    userProfile.friends = userProfile.friends.filter(
      id => id.toString() !== friendId
    );
    await userProfile.save();
    
    // Remove from friend's friends list if the friend profile exists
    if (friendProfile) {
      friendProfile.friends = friendProfile.friends.filter(
        id => id.toString() !== req.user._id.toString()
      );
      await friendProfile.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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
  addFriend,
  getFriends,
  removeFriend,
  inviteToLobby
};
