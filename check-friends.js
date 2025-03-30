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
  
  // Define a simple schema for the User collection based on what we saw
  const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
    receivedFriendRequests: Array,
    sentFriendRequests: Array
  }, { strict: false });  // Use strict:false to allow for fields not defined in the schema
  
  const User = mongoose.model('User', userSchema);
  
  try {
    // Query all users
    const users = await User.find({}).lean();
    console.log(`Total users found: ${users.length}`);
    
    // Check which users have friends
    let usersWithFriends = 0;
    for(const user of users) {
      console.log(`User ${user.username || user.email || user._id}:`);
      
      // Check friends array
      if(user.friends && user.friends.length > 0) {
        console.log(`  Has ${user.friends.length} friends: ${JSON.stringify(user.friends)}`);
        usersWithFriends++;
      } else {
        console.log('  No friends found');
      }
      
      // Check friend requests
      if(user.receivedFriendRequests && user.receivedFriendRequests.length > 0) {
        console.log(`  Has ${user.receivedFriendRequests.length} received friend requests`);
      }
      
      if(user.sentFriendRequests && user.sentFriendRequests.length > 0) {
        console.log(`  Has ${user.sentFriendRequests.length} sent friend requests`);
      }
      
      console.log('-------------------');
    }
    
    // Summary
    console.log(`\nSUMMARY: ${usersWithFriends} out of ${users.length} users have friends`);
    
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