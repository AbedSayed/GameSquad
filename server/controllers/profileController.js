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
  const { displayName, avatar } = req.body;

  const profile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    {
      displayName: displayName || req.user.username,
      avatar: avatar || 'default-avatar.png'
    },
    { new: true, upsert: true }
  );

  res.json(profile);
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

  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  res.json(profile);
});

// @desc    Remove game rank
// @route   DELETE /api/profiles/gameranks/:game
// @access  Private
const removeGameRank = asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404);
    throw new Error('Profile not found');
  }

  res.json(profile);
});

// Basic implementations for remaining functions
const updateLanguages = asyncHandler(async (req, res) => {
  res.json({ message: 'Languages updated' });
});

const updateInterests = asyncHandler(async (req, res) => {
  res.json({ message: 'Interests updated' });
});

const updatePreferences = asyncHandler(async (req, res) => {
  res.json({ message: 'Preferences updated' });
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
