require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Profile } = require('../models');
const { connectDB } = require('../config/db');

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'test123',
  displayName: 'Test User'
};

// Function to create test user
async function createTestUser() {
  try {
    console.log('Connecting to database...');
    // Use the MongoDB URI directly if it's not in .env
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb+srv://daaberhane:Motdepasse123+@cluster0.kxktn.mongodb.net/gamesquad?retryWrites=true&w=majority';
      console.log('Using hardcoded MongoDB URI');
    }
    
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: testUser.email });
    
    if (existingUser) {
      console.log('Test user already exists, deleting and recreating...');
      await User.deleteOne({ email: testUser.email });
      
      // Also delete profile if it exists
      if (existingUser.profile) {
        await Profile.deleteOne({ _id: existingUser.profile });
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testUser.password, salt);
    
    // Create user
    console.log('Creating test user...');
    const user = await User.create({
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword
    });
    
    // Create profile for user
    console.log('Creating test user profile...');
    const profile = await Profile.create({
      user: user._id,
      displayName: testUser.displayName,
      bio: 'This is a test user account for development and testing purposes.',
      level: 5,
      experience: 1000,
      gamesPlayed: 10,
      wins: 7,
      losses: 3,
      rank: 'Silver',
      isOnline: true
    });
    
    // Update user with profile reference
    user.profile = profile._id;
    await user.save();
    
    console.log('Test user created successfully!');
    console.log('Login Credentials:');
    console.log(`Email: ${testUser.email}`);
    console.log(`Password: ${testUser.password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

// Run the function
createTestUser();
