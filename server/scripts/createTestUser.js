const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB URI - replace with your actual URI for testing
const MONGODB_URI = 'mongodb+srv://hamdiamish311:e1TRr1qZXtVn3dtg@cluster0.0me02pa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define simplified User Schema for this script
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
  },
}, { timestamps: true });

// Define simplified Profile Schema for this script
const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  bio: String,
  level: {
    type: Number,
    default: 1,
  },
  experience: {
    type: Number,
    default: 0,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Profile = mongoose.model('Profile', ProfileSchema);

// Test user data
const testUserData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'test123',
  displayName: 'Test User'
};

// Function to create test user
async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: testUserData.email });
    
    if (existingUser) {
      console.log('Test user already exists. Deleting...');
      await User.deleteOne({ email: testUserData.email });
      
      // Also delete profile if it exists
      if (existingUser.profile) {
        await Profile.deleteOne({ _id: existingUser.profile });
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testUserData.password, salt);
    
    // Create user
    console.log('Creating test user...');
    const user = await User.create({
      username: testUserData.username,
      email: testUserData.email,
      password: hashedPassword
    });
    
    // Create profile for user
    console.log('Creating test user profile...');
    const profile = await Profile.create({
      user: user._id,
      displayName: testUserData.displayName,
      bio: 'This is a test user account.',
      level: 5,
      experience: 1000,
      isOnline: true
    });
    
    // Update user with profile reference
    user.profile = profile._id;
    await user.save();
    
    console.log('\n===== TEST USER CREATED SUCCESSFULLY =====');
    console.log('Login Credentials:');
    console.log(`Email: ${testUserData.email}`);
    console.log(`Password: ${testUserData.password}`);
    console.log('=========================================\n');
    
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    // Close the database connection on error
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the function
createTestUser();
