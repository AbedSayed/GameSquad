// Authentication related JavaScript functions

// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

if (!window.APP_CONFIG?.API_URL) {
    console.error('APP_CONFIG.API_URL is not defined. Make sure config.js is loaded first.');
}

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} - Promise resolving to user data with token
 */
async function registerUser(userData) {
  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Store user data and token in localStorage
    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('token', data.token);

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Promise resolving to user data with token
 */
async function loginUser(email, password) {
  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store user data and token in localStorage
    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('token', data.token);

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Logout user
 */
function logoutUser() {
  // Remove user data and token from localStorage
  localStorage.removeItem('userInfo');
  localStorage.removeItem('token');
  
  // Redirect to home page
  window.location.href = '/index.html';
}

/**
 * Get current user info
 * @returns {Object|null} - User info or null if not logged in
 */
function getCurrentUser() {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo) : null;
}

/**
 * Check if user is logged in
 * @returns {boolean} - Whether user is logged in
 */
function isLoggedIn() {
  return localStorage.getItem('token') !== null;
}

/**
 * Get user profile
 * @returns {Promise} - Promise resolving to user profile data
 */
async function getUserProfile() {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profile');
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} - Promise resolving to updated user data
 */
async function updateUserProfile(profileData) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    // Update stored user info
    localStorage.setItem('userInfo', JSON.stringify(data));
    
    // Update token if a new one is returned
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

/**
 * Update user online status
 * @param {string} status - New status ('online', 'offline', 'away', 'busy')
 * @returns {Promise} - Promise resolving to status update result
 */
async function updateUserStatus(status) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update status');
    }

    return data;
  } catch (error) {
    console.error('Update status error:', error);
    throw error;
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise} - Promise resolving to user data
 */
async function getUserById(userId) {
  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user');
    }

    return data;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

/**
 * Search users with filters
 * @param {Object} filters - Search filters
 * @returns {Promise} - Promise resolving to array of users
 */
async function searchUsers(filters = {}) {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    if (filters.game) queryParams.append('game', filters.game);
    if (filters.rank) queryParams.append('rank', filters.rank);
    if (filters.language) queryParams.append('language', filters.language);
    if (filters.interest) queryParams.append('interest', filters.interest);
    if (filters.status) queryParams.append('status', filters.status);
    
    const queryString = queryParams.toString();
    const url = `${window.APP_CONFIG.API_URL}/users${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to search users');
    }

    return data;
  } catch (error) {
    console.error('Search users error:', error);
    throw error;
  }
}

// Export functions
window.Auth = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  isLoggedIn,
  getUserProfile,
  updateUserProfile,
  updateUserStatus,
  getUserById,
  searchUsers,
};
