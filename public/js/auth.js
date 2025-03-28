// Authentication related JavaScript functions

// Create the Auth namespace for global access
window.Auth = window.Auth || {};

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
window.Auth.registerUser = async function(userData) {
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
window.Auth.loginUser = async function(email, password) {
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
window.Auth.logoutUser = function() {
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
window.Auth.getCurrentUser = function() {
  try {
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
      return null;
    }
    
    const userInfo = JSON.parse(userInfoStr);
    
    // Validate the user info has required fields
    if (!userInfo || !userInfo.username || userInfo.username.trim() === '') {
      console.warn('Invalid user info in localStorage, returning null');
      return null;
    }
    
    return userInfo;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is logged in
 * @returns {boolean} - Whether user is logged in
 */
window.Auth.isLoggedIn = function() {
  try {
    const token = localStorage.getItem('token');
    const userInfoStr = localStorage.getItem('userInfo');
    
    if (!token || !userInfoStr) {
      return false;
    }
    
    // Parse user info to check validity
    try {
      const userInfo = JSON.parse(userInfoStr);
      
      // Check if the userInfo has the expected structure
      const isValid = userInfo && 
                      userInfo.username && 
                      typeof userInfo.username === 'string' &&
                      userInfo.username.trim() !== '';
      
      if (!isValid) {
        console.warn('Invalid user info structure detected in isLoggedIn');
      }
      
      return isValid;
    } catch (parseError) {
      console.error('Error parsing userInfo in isLoggedIn:', parseError);
      return false;
    }
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

/**
 * Get user profile
 * @returns {Promise} - Promise resolving to user profile data
 */
window.Auth.getUserProfile = async function() {
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
window.Auth.updateUserProfile = async function(profileData) {
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
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const updatedUserInfo = { ...userInfo, ...data };
    localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

/**
 * Update user online status
 * @param {string} status - New status
 * @returns {Promise} - Promise resolving to updated user data
 */
window.Auth.updateUserStatus = async function(status) {
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
window.Auth.getUserById = async function(userId) {
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
window.Auth.searchUsers = async function(filters = {}) {
  try {
    // Construct query string from filters
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        queryParams.append(key, value);
      }
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/users?${queryParams}`, {
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

// Add a console log to confirm the Auth namespace is properly initialized
console.log('Auth module loaded and namespace initialized');
