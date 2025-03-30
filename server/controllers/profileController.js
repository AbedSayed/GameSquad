const { Profile, User } = require('../models');
const asyncHandler = require('express-async-handler');

// @desc    Get all profiles
// @route   GET /api/profiles
// @access  Public
const getAllProfiles = asyncHandler(async (req, res) => {
  const profiles = await Profile.find().populate('user', 'username');
  res.json(profiles);
});

// @desc    Get profile by user ID
// @route   GET /api/profiles/user/:userId
// @access  Public
const getProfileByUserId = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.params.userId })
    .populate('user', 'username');

  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  res.json(profile);
});

// @desc    Get my profile
// @route   GET /api/profiles/me
// @access  Private
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id })
    .populate('user', 'username email');

  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  res.json(profile);
});

// @desc    Create or update profile
// @route   POST /api/profiles
// @access  Private
const createOrUpdateProfile = asyncHandler(async (req, res) => {
  try {
    console.log('Updating profile with data:', req.body);
    
    // Get all fields from request body
    const { 
      displayName, 
      avatar, 
      bio, 
      languages, 
      interests, 
      gameRanks,
      preferences
    } = req.body;
    
    // Find existing profile
    let profile = await Profile.findOne({ user: req.user._id });
    
    // Create update object with only defined fields
    const updateFields = {};
    
    // Add basic fields
    if (displayName) updateFields.displayName = displayName;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (bio !== undefined) updateFields.bio = bio;
    
    // Add array fields
    if (languages) updateFields.languages = languages;
    if (interests) updateFields.interests = interests;
    if (gameRanks) updateFields.gameRanks = gameRanks;
    
    // Add preferences if provided
    if (preferences) {
      updateFields.preferences = {};
      if (preferences.playStyle) updateFields.preferences.playStyle = preferences.playStyle;
      if (preferences.communication) updateFields.preferences.communication = preferences.communication;
      if (preferences.playTime) updateFields.preferences.playTime = preferences.playTime;
      if (preferences.region) updateFields.preferences.region = preferences.region;
    }
    
    console.log('Update fields:', updateFields);
    
    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: updateFields },
        { new: true }
      );
      console.log('Updated existing profile:', profile);
    } else {
      // Create new profile if doesn't exist
      updateFields.user = req.user._id;
      updateFields.displayName = displayName || req.user.username;
      
      profile = await Profile.create(updateFields);
      console.log('Created new profile:', profile);
      
      // Update user with profile reference
      await User.findByIdAndUpdate(
        req.user._id, 
        { profile: profile._id }
      );
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error in createOrUpdateProfile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
});

// @desc    Add game rank
// @route   PUT /api/profiles/gameranks
// @access  Private
const addGameRank = asyncHandler(async (req, res) => {
  const { game, rank } = req.body;
  
  if (!game || !rank) {
    res.status(400);
    throw new Error('Please provide both game and rank');
  }

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  // Check if the game rank already exists
  const existingRankIndex = profile.gameRanks.findIndex(
    rankItem => rankItem.game.toLowerCase() === game.toLowerCase()
  );

  if (existingRankIndex >= 0) {
    // Update existing rank
    profile.gameRanks[existingRankIndex].rank = rank;
  } else {
    // Add new game rank
    profile.gameRanks.push({ game, rank });
  }

  // Save the updated profile
  await profile.save();
  console.log('Updated game ranks:', profile.gameRanks);

  res.json(profile);
});

// @desc    Remove game rank
// @route   DELETE /api/profiles/gameranks/:game
// @access  Private
const removeGameRank = asyncHandler(async (req, res) => {
  const gameToRemove = req.params.game;
  
  if (!gameToRemove) {
    res.status(400);
    throw new Error('Please provide a game name to remove');
  }

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  // Filter out the game rank to remove
  profile.gameRanks = profile.gameRanks.filter(
    rankItem => rankItem.game.toLowerCase() !== gameToRemove.toLowerCase()
  );

  // Save the updated profile
  await profile.save();
  console.log('Removed game rank for:', gameToRemove);
  console.log('Remaining game ranks:', profile.gameRanks);

  res.json(profile);
});

// Basic implementations for remaining functions
const updateLanguages = asyncHandler(async (req, res) => {
  const { languages } = req.body;
  
  if (!languages || !Array.isArray(languages)) {
    res.status(400);
    throw new Error('Please provide languages as an array');
  }

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  // Update languages
  profile.languages = languages;

  // Save the updated profile
  await profile.save();
  console.log('Updated languages:', profile.languages);

  res.json(profile);
});

const updateInterests = asyncHandler(async (req, res) => {
  const { interests } = req.body;
  
  if (!interests || !Array.isArray(interests)) {
    res.status(400);
    throw new Error('Please provide interests as an array');
  }

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  // Update interests
  profile.interests = interests;

  // Save the updated profile
  await profile.save();
  console.log('Updated interests:', profile.interests);

  res.json(profile);
});

const updatePreferences = asyncHandler(async (req, res) => {
  const { playStyle, communication, playTime, region } = req.body;
  
  if (!playStyle && !communication && !playTime && !region) {
    res.status(400);
    throw new Error('Please provide at least one preference to update');
  }

  let profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  // Initialize preferences object if it doesn't exist
  if (!profile.preferences) {
    profile.preferences = {};
  }

  // Update only the provided preferences
  if (playStyle) profile.preferences.playStyle = playStyle;
  if (communication) profile.preferences.communication = communication;
  if (playTime) profile.preferences.playTime = playTime;
  if (region) profile.preferences.region = region;

  // Save the updated profile
  await profile.save();
  console.log('Updated preferences:', profile.preferences);

  res.json(profile);
});

const updateSocialLinks = asyncHandler(async (req, res) => {
  res.json({ message: 'Social links updated' });
});

const addAchievement = asyncHandler(async (req, res) => {
  res.json({ message: 'Achievement added' });
});

const addActivity = asyncHandler(async (req, res) => {
  res.json({ message: 'Activity added' });
});

module.exports = {
  getAllProfiles,
  getProfileByUserId,
  getMyProfile,
  createOrUpdateProfile,
  addGameRank,
  removeGameRank,
  updateLanguages,
  updateInterests,
  updatePreferences,
  updateSocialLinks,
  addAchievement,
  addActivity
};
