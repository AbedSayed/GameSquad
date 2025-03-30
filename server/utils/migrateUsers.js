// Utility to migrate users to ensure they have friend structures
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/db');

// Connect to database
connectDB()
  .then(async () => {
    console.log('Connected to database');
    
    try {
      console.log('Starting user migration...');
      const users = await User.find({});
      console.log(`Found ${users.length} users to check`);
      
      let updatedCount = 0;
      
      for (const user of users) {
        let needsUpdate = false;
        
        // Check if friends array exists
        if (!user.friends) {
          user.friends = [];
          needsUpdate = true;
          console.log(`Adding friends array to user ${user.username || user.email}`);
        }
        
        // Check if friendRequests object exists
        if (!user.friendRequests) {
          user.friendRequests = { sent: [], received: [] };
          needsUpdate = true;
          console.log(`Adding friendRequests object to user ${user.username || user.email}`);
        } else {
          // Check if sent and received arrays exist
          if (!user.friendRequests.sent) {
            user.friendRequests.sent = [];
            needsUpdate = true;
          }
          
          if (!user.friendRequests.received) {
            user.friendRequests.received = [];
            needsUpdate = true;
          }
        }
        
        // Save user if needed
        if (needsUpdate) {
          await user.save();
          updatedCount++;
        }
      }
      
      console.log(`Migration complete. Updated ${updatedCount} users.`);
    } catch (error) {
      console.error('Error during migration:', error);
    } finally {
      mongoose.connection.close();
      console.log('Database connection closed');
    }
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  }); 