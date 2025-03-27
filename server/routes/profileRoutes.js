const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllProfiles);
router.get('/user/:userId', getProfileByUserId);

// Protected routes
router.get('/me', protect, getMyProfile);
router.post('/', protect, createOrUpdateProfile);
router.put('/gameranks', protect, addGameRank);
router.delete('/gameranks/:game', protect, removeGameRank);
router.put('/languages', protect, updateLanguages);
router.put('/interests', protect, updateInterests);
router.put('/preferences', protect, updatePreferences);
router.put('/social', protect, updateSocialLinks);
router.put('/achievements', protect, addAchievement);
router.put('/activity', protect, addActivity);

module.exports = router;
