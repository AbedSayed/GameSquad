const mongoose = require('mongoose');
const { User, Profile } = require('../models');
require('dotenv').config();

const testUsers = [
    {
        username: 'GamerPro123',
        email: 'gamerpro123@test.com',
        password: 'TestPass123!'
    },
    {
        username: 'QuestMaster',
        email: 'questmaster@test.com',
        password: 'TestPass123!'
    },
    {
        username: 'PixelWarrior',
        email: 'pixelwarrior@test.com',
        password: 'TestPass123!'
    },
    {
        username: 'LootHunter',
        email: 'loothunter@test.com',
        password: 'TestPass123!'
    },
    {
        username: 'BossFighter',
        email: 'bossfighter@test.com',
        password: 'TestPass123!'
    }
];

const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const bios = [
    'Passionate gamer looking for new challenges!',
    'Here to make friends and win games!',
    'Competitive player seeking worthy opponents.',
    'Casual gamer who loves to have fun!',
    'Strategy game enthusiast and team player.'
];

async function addTestUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://hamdiamish311:e1TRr1qZXtVn3dtg@cluster0.0me02pa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        console.log('Connected to MongoDB');

        // Delete existing test users
        await User.deleteMany({ email: { $regex: '@test.com$' } });
        console.log('Deleted existing test users');

        // Create new test users
        for (const userData of testUsers) {
            // Create user
            const user = await User.create(userData);
            console.log(`Created user: ${user.username}`);

            // Create profile for user
            const profile = await Profile.create({
                user: user._id,
                displayName: user.username,
                bio: bios[Math.floor(Math.random() * bios.length)],
                level: Math.floor(Math.random() * 50) + 1,
                experience: Math.floor(Math.random() * 10000),
                gamesPlayed: Math.floor(Math.random() * 100),
                wins: Math.floor(Math.random() * 50),
                losses: Math.floor(Math.random() * 50),
                rank: ranks[Math.floor(Math.random() * ranks.length)],
                isOnline: Math.random() > 0.5
            });
            console.log(`Created profile for: ${user.username}`);
        }

        console.log('Successfully added all test users');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addTestUsers(); 