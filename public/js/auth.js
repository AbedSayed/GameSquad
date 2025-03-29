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
 * Get the current user from localStorage
 * @returns {Object|null} - User data or null if not logged in
 */
function getCurrentUser() {
  try {
    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) {
      console.error('No user information in localStorage');
      return null;
    }
    
    const userInfo = JSON.parse(userInfoString);
    // Verify that the user info contains the expected data format
    if (!userInfo || !userInfo._id || !userInfo.username) {
      console.error('Invalid user info in localStorage:', userInfo);
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
 * @returns {boolean} - True if logged in, false otherwise
 */
function isLoggedIn() {
  try {
    const token = localStorage.getItem('token');
    const userInfo = getCurrentUser();
    
    if (!token || !userInfo) {
      return false;
    }
    
    // Additional validation - username shouldn't be empty or default
    if (!userInfo.username || userInfo.username === 'Guest' || userInfo.username === '') {
      console.warn('Invalid username detected in localStorage:', userInfo.username);
      return false;
    }
    
    return true;
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

/**
 * Update the user info in localStorage after friend operations
 * @param {Object} updatedUserInfo - New user info with updated friends
 */
function updateUserInfo(updatedUserInfo) {
  try {
    // Get current user info first
    const currentUserInfo = getCurrentUser();
    if (!currentUserInfo) {
      console.error('No user info to update');
      return false;
    }
    
    // Merge the updated info with existing info
    const mergedUserInfo = { ...currentUserInfo, ...updatedUserInfo };
    localStorage.setItem('userInfo', JSON.stringify(mergedUserInfo));
    return true;
  } catch (error) {
    console.error('Error updating user info:', error);
    return false;
  }
}

/**
 * Initialize socket connection for real-time notifications
 * @param {string} userId - User ID for authentication
 */
function initSocketConnection(userId) {
  if (!window.io) {
    console.error('Socket.IO not loaded');
    return;
  }
  
  // Create or use existing socket connection
  if (!window.socket) {
    window.socket = io();
  }
  
  // Authenticate the socket connection
  window.socket.emit('authenticate', { userId });
  
  // Set up socket event listeners for friend-related events
  window.socket.on('new-friend-request', (data) => {
    showNotification(`${data.senderName} sent you a friend request!`, 'info');
    
    // Update local data if needed
    refreshUserData();
  });
  
  window.socket.on('friend-request-accepted', (data) => {
    showNotification(`${data.acceptedByName} accepted your friend request!`, 'success');
    
    // Update local data
    refreshUserData();
  });
}

/**
 * Refresh user data from the server
 * @returns {Promise} - Promise resolving to updated user data
 */
async function refreshUserData() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to refresh user data');
    }
    
    // Update localStorage with fresh data
    const userInfo = {
      _id: data._id,
      username: data.username,
      email: data.email,
      friends: data.friends || [],
      friendRequests: data.friendRequests || { sent: [], received: [] }
    };
    
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    return userInfo;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return null;
  }
}

/**
 * Display a notification to the user
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
  // Check if notification container exists, create if not
  let notificationContainer = document.getElementById('notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.backgroundColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.margin = '5px 0';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.style.transition = 'all 0.3s ease';
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Add a console log to confirm the Auth namespace is properly initialized
console.log('Auth module loaded and namespace initialized');

// Export functions globally to make them accessible to other scripts
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.AUTH = {
  loginUser,
  registerUser,
  logoutUser,
  isLoggedIn,
  getCurrentUser,
  updateUserInfo,
  refreshUserData,
  showNotification
};
