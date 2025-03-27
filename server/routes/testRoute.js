const express = require('express');
const router = express.Router();
const { connectDB } = require('../config/db');

// Test database connection
router.get('/db-test', async (req, res) => {
  try {
    await connectDB();
    res.json({ message: 'Database connection successful!' });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ error: 'Database connection test failed' });
  }
});

// Test server
router.get('/ping', (req, res) => {
  res.json({ message: 'Server is running!' });
});

module.exports = router; 