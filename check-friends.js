require('dotenv').config();
const mongoose = require('mongoose');

// Use the same MongoDB URI as the application
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hamdiamish311:e1TRr1qZXtVn3dtg@cluster0.0me02pa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB successfully!');
  
  // Define a simple schema for the User collection based on the actual schema
  const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
    friendRequests: {
      sent: [{
        _id: mongoose.Schema.Types.ObjectId,
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: String,
        message: String,
        createdAt: Date
      }],
      received: [{
        _id: mongoose.Schema.Types.ObjectId,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: String,
        message: String,
        createdAt: Date
      }]
    }
  }, { strict: false });  // Use strict:false to allow for fields not defined in the schema
  
  const User = mongoose.model('User', userSchema);
  
  try {
    // Query all users
    const users = await User.find({}).populate('friends', 'username email').lean();
    console.log(`Total users found: ${users.length}`);
    
    // Check which users have friends
    let usersWithFriends = 0;
    let usersWithSentRequests = 0;
    let usersWithReceivedRequests = 0;
    let brokenFriendships = 0;
    let brokenRequests = 0;
    
    for(const user of users) {
      console.log(`\nUser ${user.username || user.email || user._id}:`);
      
      // Check friends array
      if(user.friends && user.friends.length > 0) {
        console.log(`  Has ${user.friends.length} friends:`);
        for(const friend of user.friends) {
          // If the friend was populated successfully
          if(friend.username) {
            console.log(`    - ${friend.username} (${friend._id})`);
          } else {
            console.log(`    - Non-existent user: ${friend}`);
            brokenFriendships++;
          }
        }
        usersWithFriends++;
      } else {
        console.log('  No friends found');
      }
      
      // Check sent friend requests
      if(user.friendRequests && user.friendRequests.sent && user.friendRequests.sent.length > 0) {
        console.log(`  Has ${user.friendRequests.sent.length} sent friend requests:`);
        for(const request of user.friendRequests.sent) {
          console.log(`    - To: ${request.recipient}, Status: ${request.status || 'unknown'}, Created: ${request.createdAt || 'unknown'}`);
          if(!request.recipient) {
            brokenRequests++;
          }
        }
        usersWithSentRequests++;
      } else {
        console.log('  No sent friend requests');
      }
      
      // Check received friend requests
      if(user.friendRequests && user.friendRequests.received && user.friendRequests.received.length > 0) {
        console.log(`  Has ${user.friendRequests.received.length} received friend requests:`);
        for(const request of user.friendRequests.received) {
          console.log(`    - From: ${request.sender}, Status: ${request.status || 'unknown'}, Created: ${request.createdAt || 'unknown'}`);
          if(!request.sender) {
            brokenRequests++;
          }
        }
        usersWithReceivedRequests++;
      } else {
        console.log('  No received friend requests');
      }
      
      console.log('-------------------');
    }
    
    // Summary
    console.log(`\nSUMMARY:`);
    console.log(`- Total users: ${users.length}`);
    console.log(`- Users with friends: ${usersWithFriends} (${Math.round(usersWithFriends/users.length*100)}%)`);
    console.log(`- Users with sent requests: ${usersWithSentRequests} (${Math.round(usersWithSentRequests/users.length*100)}%)`);
    console.log(`- Users with received requests: ${usersWithReceivedRequests} (${Math.round(usersWithReceivedRequests/users.length*100)}%)`);
    console.log(`- Broken friendships found: ${brokenFriendships}`);
    console.log(`- Broken requests found: ${brokenRequests}`);
    
  } catch (error) {
    console.error('Error querying the database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
}); 