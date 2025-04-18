
window.Auth = window.Auth || {};


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
    console.log('Validating registration data');
    
    if (!userData.email || !userData.password || !userData.username) {
      throw new Error('Email, password and username are required');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }
    
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    if (userData.username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    
    const requestData = {
      username: userData.username,
      email: userData.email,
      password: userData.password
    };
    
    if (userData.profile) {
      requestData.profile = userData.profile;
    }
    
    console.log('Sending registration data to server with profile:', requestData);
    
    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
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
        console.log('Validating login credentials');
        
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
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
  localStorage.removeItem('userInfo');
  localStorage.removeItem('token');
  
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
  const token = getAuthToken();
  
  if (!token) {
    return false;
  }
  
  if (token.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        clearAuthData();
        return false;
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
  }
  
  return true;
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
    const currentUserInfo = getCurrentUser();
    if (!currentUserInfo) {
      console.error('No user info to update');
      return false;
    }
    
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
  
  if (!window.socket) {
    window.socket = io();
  }
  
  window.socket.emit('authenticate', { userId });
  
  window.socket.on('new-friend-request', (data) => {
    showNotification(`${data.senderName} sent you a friend request!`, 'info');
    
    refreshUserData();
  });
  
  window.socket.on('friend-request-accepted', (data) => {
    showNotification(`${data.acceptedByName} accepted your friend request!`, 'success');
    
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
  
  notificationContainer.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

console.log('Auth module loaded and namespace initialized');

window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.AUTH = {
  loginUser: window.Auth.loginUser,
  registerUser: window.Auth.registerUser,
  logoutUser: window.Auth.logoutUser,
  isLoggedIn,
  getCurrentUser,
  updateUserInfo,
  refreshUserData,
  showNotification
};

function getAuthToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}

function saveAuthToken(token) {
  if (!token) return false;
  
  const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;
  
  localStorage.setItem('authToken', tokenValue);
  localStorage.setItem('token', tokenValue);
  return true;
}


function clearAuthData() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
}


function getUserInfo() {
  const userInfoStr = localStorage.getItem('userInfo');
  
  if (!userInfoStr) {
    return null;
  }
  
  try {
    return JSON.parse(userInfoStr);
  } catch (e) {
    console.error('Error parsing user info:', e);
    return null;
  }
}


function saveUserInfo(userInfo) {
  if (!userInfo) return false;
  
  try {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    return true;
  } catch (e) {
    console.error('Error saving user info:', e);
    return false;
  }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    

    if (!email || !password) {
        showLoginError('Please enter both email and password');
        return;
    }
    
    try {

        const loginBtn = document.querySelector('button[type="submit"]');
        if (loginBtn) {
            const originalBtnText = loginBtn.innerHTML;
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        }
        

        const user = await window.Auth.loginUser(email, password);
        

        if (window.showNotification) {
            window.showNotification('Login successful!', 'success');
        } else {
            alert('Login successful!');
        }
        

        redirectAfterLogin();
        
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(error.message || 'Login failed. Please try again.');
        

        const loginBtn = document.querySelector('button[type="submit"]');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
        }
    }
}



