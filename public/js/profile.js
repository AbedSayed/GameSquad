// Profile related JavaScript functions

// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

if (!window.APP_CONFIG?.API_URL) {
    console.error('APP_CONFIG.API_URL is not defined. Make sure config.js is loaded first.');
}

/**
 * Get current user's profile
 * @returns {Promise} - Promise resolving to profile data
 */
async function getMyProfile() {
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
 * Create or update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function createOrUpdateProfile(profileData) {
  try {
    console.log('Updating profile with data:', profileData);
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    // Make sure we're sending valid non-empty data
    const cleanedData = {};
    
    // Only include fields with actual content
    Object.keys(profileData).forEach(key => {
      const value = profileData[key];
      if (value !== undefined && value !== null) {
        // For strings, ensure they're not empty
        if (typeof value === 'string') {
          if (value.trim() !== '') {
            cleanedData[key] = value.trim();
          }
        } 
        // For objects like preferences, include them if they have properties
        else if (typeof value === 'object' && !Array.isArray(value)) {
          if (Object.keys(value).length > 0) {
            cleanedData[key] = value;
          }
        }
        // For arrays or other values, include them
        else {
          cleanedData[key] = value;
        }
      }
    });

    if (Object.keys(cleanedData).length === 0) {
      throw new Error('No valid data to update');
    }

    console.log('Sending cleaned profile data to server:', cleanedData);

    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(cleanedData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Server error response:', data);
      throw new Error(data.message || 'Failed to update profile');
    }

    console.log('Profile updated successfully on server:', data);

    // Update local storage with new profile data
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        
        // If userInfo already has a profile, update it, otherwise create it
        if (!userInfo.profile) userInfo.profile = {};
        
        // Update profile with the data we received from the server, or fall back to what we sent
        userInfo.profile = { 
          ...userInfo.profile, 
          ...cleanedData,
          // Add any fields returned from the server response if available
          ...(data.profile || data)
        };
        
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('Updated profile in localStorage');
      }
    } catch (storageError) {
      console.warn('Could not update localStorage after profile update', storageError);
    }

    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

/**
 * Add or update game rank
 * @param {Object} rankData - Game rank data
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function addGameRank(rankData) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/gameranks`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(rankData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update game rank');
    }

    return data;
  } catch (error) {
    console.error('Update game rank error:', error);
    throw error;
  }
}

/**
 * Remove game rank
 * @param {string} game - Game name
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function removeGameRank(game) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/gameranks/${game}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to remove game rank');
    }

    return data;
  } catch (error) {
    console.error('Remove game rank error:', error);
    throw error;
  }
}

/**
 * Update languages
 * @param {Array} languages - Array of languages
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function updateLanguages(languages) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/languages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ languages }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update languages');
    }

    return data;
  } catch (error) {
    console.error('Update languages error:', error);
    throw error;
  }
}

/**
 * Update interests
 * @param {Array} interests - Array of interests
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function updateInterests(interests) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/interests`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ interests }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update interests');
    }

    return data;
  } catch (error) {
    console.error('Update interests error:', error);
    throw error;
  }
}

/**
 * Update preferences
 * @param {Object} preferences - Preferences object
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function updatePreferences(preferences) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(preferences),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update preferences');
    }

    return data;
  } catch (error) {
    console.error('Update preferences error:', error);
    throw error;
  }
}

/**
 * Update social links
 * @param {Object} socialLinks - Social links object
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function updateSocialLinks(socialLinks) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/social`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(socialLinks),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update social links');
    }

    return data;
  } catch (error) {
    console.error('Update social links error:', error);
    throw error;
  }
}

/**
 * Add activity
 * @param {Object} activity - Activity data
 * @returns {Promise} - Promise resolving to updated profile data
 */
async function addActivity(activity) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/activity`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(activity),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add activity');
    }

    return data;
  } catch (error) {
    console.error('Add activity error:', error);
    throw error;
  }
}

/**
 * Get profile by user ID
 * @param {string} userId - User ID
 * @returns {Promise} - Promise resolving to profile data
 */
async function getProfileByUserId(userId) {
    console.log(`getProfileByUserId: Fetching profile for user ID: ${userId}`);
    
    try {
        // Log available configuration 
        console.log('Configuration debug:');
        console.log('- window.APP_CONFIG:', window.APP_CONFIG);
        console.log('- window.config:', window.config);
        console.log('- Available API_URL:', window.APP_CONFIG?.API_URL || window.config?.API_URL || '/api');
        
        // Ensure we have the API URL - try multiple possible locations
        let apiUrl = '/api'; // Default fallback
        
        if (window.APP_CONFIG && window.APP_CONFIG.API_URL) {
            apiUrl = window.APP_CONFIG.API_URL;
            console.log('Using API URL from window.APP_CONFIG:', apiUrl);
        } else if (window.config && window.config.API_URL) {
            apiUrl = window.config.API_URL;
            console.log('Using API URL from window.config:', apiUrl);
        } else {
            console.log('No configuration found, using default API URL:', apiUrl);
        }
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const url = `${apiUrl}/users/${userId}?t=${timestamp}`;
        
        console.log(`getProfileByUserId: Fetching from URL: ${url}`);
        
        // Get the authentication token
        let token = localStorage.getItem('token') || localStorage.getItem('authToken');
        if (!token) {
            console.error('getProfileByUserId: No auth token found in localStorage');
            console.log('Checking for token in different storage locations');
            console.log('- localStorage.token:', localStorage.getItem('token'));
            console.log('- localStorage.authToken:', localStorage.getItem('authToken'));
            
            // Try to get token from Auth module if available
            if (window.Auth && typeof window.Auth.getToken === 'function') {
                token = window.Auth.getToken();
                console.log('- Token from Auth module:', token ? 'Found' : 'Not found');
            }
            
            // If still no token, we can't proceed
            if (!token) {
                console.error('No authentication token available. User may need to log in again.');
                return null;
            }
            
            console.log('Using token from Auth module');
        }
        
        // Make the API request
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // Ensure we don't use cached responses
            cache: 'no-store'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`getProfileByUserId: API error (${response.status}):`, errorText);
            throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
        }
        
        const userData = await response.json();
        console.log('getProfileByUserId: User data received:', userData);
        
        // If the userData includes a profile, return the combined data
        if (userData.profile) {
            console.log('User data includes profile, returning combined data');
            // Ensure the user data is attached to the profile
            const profileData = {
                ...userData.profile,
                user: {
                    _id: userData._id,
                    username: userData.username,
                    email: userData.email
                }
            };
            
            // Make sure we have a displayName
            if (!profileData.displayName) {
                profileData.displayName = userData.username;
            }
            
            return profileData;
        }
        
        // If we don't have a profile, create a minimal one from user data
        const minimalProfile = {
            _id: userData._id,
            user: {
                _id: userData._id,
                username: userData.username,
                email: userData.email
            },
            displayName: userData.username,
            bio: userData.bio || 'No bio available',
            createdAt: userData.createdAt,
            avatar: userData.avatar || '../resources/default-avatar.png',
            gameRanks: userData.gameRanks || [],
            languages: userData.languages || [],
            interests: userData.interests || [],
            preferences: userData.preferences || {
                playStyle: 'Not specified',
                communication: 'Not specified',
                playTime: 'Not specified',
                region: 'Not specified'
            }
        };
        
        console.log('Created minimal profile from user data:', minimalProfile);
        return minimalProfile;
    } catch (error) {
        console.error('Error in getProfileByUserId:', error);
        return null;
    }
}

/**
 * Get all profiles
 * @returns {Promise} - Promise resolving to array of profiles
 */
async function getAllProfiles() {
  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profiles');
    }

    return data;
  } catch (error) {
    console.error('Get profiles error:', error);
    throw error;
  }
}

/**
 * Get current user's friends list
 * @returns {Promise} - Promise resolving to friends data
 */
async function getFriends() {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/friends`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get friends list');
    }

    return data;
  } catch (error) {
    console.error('Get friends error:', error);
    throw error;
  }
}

/**
 * Get user's friend requests
 * @returns {Promise} - Promise resolving to friend requests data
 */
async function getFriendRequests() {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/friends/requests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get friend requests');
    }

    return data;
  } catch (error) {
    console.error('Get friend requests error:', error);
    throw error;
  }
}

/**
 * Accept a friend request
 * @param {string} requestId - Friend request ID
 * @returns {Promise} - Promise resolving to updated friends data
 */
async function acceptFriendRequest(requestId) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/friends/accept/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to accept friend request');
    }

    return data;
  } catch (error) {
    console.error('Accept friend request error:', error);
    throw error;
  }
}

/**
 * Reject a friend request
 * @param {string} requestId - Friend request ID
 * @returns {Promise} - Promise resolving to updated requests data
 */
async function rejectFriendRequest(requestId) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/friends/reject/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reject friend request');
    }

    return data;
  } catch (error) {
    console.error('Reject friend request error:', error);
    throw error;
  }
}

/**
 * Cancel a sent friend request
 * @param {string} requestId - Friend request ID
 * @returns {Promise} - Promise resolving to updated requests data
 */
async function cancelFriendRequest(requestId) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/friends/cancel/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to cancel friend request');
    }

    return data;
  } catch (error) {
    console.error('Cancel friend request error:', error);
    throw error;
  }
}

/**
 * Remove a friend
 * @param {string} friendId - Friend user ID
 * @returns {Promise} - Promise resolving to updated friends data
 */
async function removeFriend(friendId) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to remove friend');
    }

    return data;
  } catch (error) {
    console.error('Remove friend error:', error);
    throw error;
  }
}

/**
 * Invite a friend to a lobby
 * @param {string} friendId - Friend user ID
 * @param {string} lobbyId - Lobby ID to invite to
 * @returns {Promise} - Promise resolving to invitation data
 */
async function inviteFriendToLobby(friendId, lobbyId) {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/invite/${friendId}/lobby/${lobbyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send lobby invitation');
    }

    return data;
  } catch (error) {
    console.error('Invite friend to lobby error:', error);
    throw error;
  }
}

/**
 * Update friends UI with friend data
 * @param {Object|Array} friendsData - Friends data from API
 */
function updateFriendsUI(friendsData) {
  const friendsContainer = document.getElementById('friends-list');
  
  // Check if the friends container exists
  if (!friendsContainer) {
    console.log('No friends container found in the UI, skipping friends update');
    return;
  }
  
  // Clear loading state
  friendsContainer.innerHTML = '';
  
  // Handle different data structures for friends
  let friends = [];
  if (Array.isArray(friendsData)) {
    friends = friendsData;
  } else if (friendsData && typeof friendsData === 'object') {
    // Try to extract friends array from object
    if (Array.isArray(friendsData.friends)) {
      friends = friendsData.friends;
    } else if (friendsData.data && Array.isArray(friendsData.data)) {
      friends = friendsData.data;
    } else {
      console.warn('Friends data is not in expected format:', friendsData);
    }
  } else {
    console.warn('Invalid friends data type:', typeof friendsData);
  }
  
  // If no friends or empty array, show empty state
  if (!friends || friends.length === 0) {
    friendsContainer.innerHTML = '<p class="no-friends">You have not added any friends yet.</p>';
    return;
  }
  
  // Create a friend card for each friend
  friends.forEach(friend => {
    // Handle different friend data structures
    if (!friend) return;
    
    const friendCard = document.createElement('div');
    friendCard.className = 'friend-card';
    friendCard.setAttribute('data-friend-id', friend._id || friend.id || '');
    
    // Get profile info with safeguards for missing data
    const profile = friend.profile || {};
    const displayName = profile.displayName || friend.username || friend.displayName || 'Unknown User';
    const avatar = profile.avatar || friend.avatar || 'default-avatar.png';
    const isOnline = profile.isOnline || friend.isOnline || false;
    
    // Status indicator class
    const statusClass = isOnline ? 'status-online' : '';
    
    friendCard.innerHTML = `
      <div class="friend-avatar-container">
        <img src="/images/avatars/${avatar}" alt="${displayName}'s avatar" class="friend-avatar">
        <span class="status-indicator ${statusClass}"></span>
      </div>
      <div class="friend-info">
        <h3 class="friend-name">${displayName}</h3>
        <p class="friend-status">${isOnline ? 'Online' : ''}</p>
      </div>
      <div class="friend-actions">
        <button class="btn btn-primary message-friend-btn" title="Message">
          <i class="fas fa-comment"></i>
        </button>
        <button class="btn btn-info invite-friend-btn" title="Invite to Lobby">
          <i class="fas fa-gamepad"></i>
        </button>
        <button class="btn btn-danger remove-friend-btn" title="Remove Friend">
          <i class="fas fa-user-minus"></i>
        </button>
      </div>
    `;
    
    // Add event listeners
    const messageFriendBtn = friendCard.querySelector('.message-friend-btn');
    messageFriendBtn.addEventListener('click', () => {
      // TODO: Implement messaging functionality
      showNotification('Messaging feature coming soon!', 'info');
    });
    
    const inviteFriendBtn = friendCard.querySelector('.invite-friend-btn');
    inviteFriendBtn.addEventListener('click', () => {
      showLobbyInviteModal(friend._id || friend.id || '', displayName);
    });
    
    const removeFriendBtn = friendCard.querySelector('.remove-friend-btn');
    removeFriendBtn.addEventListener('click', async () => {
      try {
        await removeFriend(friend._id || friend.id || '');
        friendCard.classList.add('removing');
        setTimeout(() => {
          friendCard.remove();
          
          // Check if any friends remain
          if (friendsContainer.children.length === 0) {
            friendsContainer.innerHTML = '<p class="no-friends">You have not added any friends yet.</p>';
          }
          
          showNotification(`${displayName} removed from your friends list`, 'success');
        }, 300);
      } catch (error) {
        showNotification(`Failed to remove friend: ${error.message}`, 'error');
      }
    });
    
    friendsContainer.appendChild(friendCard);
  });
}

/**
 * Show lobby invite modal
 * @param {string} friendId - ID of friend to invite
 * @param {string} friendName - Name of friend to display
 */
function showLobbyInviteModal(friendId, friendName) {
  // Fetch user's lobbies first
  fetchUserLobbies().then(lobbies => {
    if (!lobbies || lobbies.length === 0) {
      showNotification('You need to create a lobby first to invite friends', 'info');
      return;
    }
    
    // Create modal HTML
    const modalHtml = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Invite ${friendName} to Lobby</h2>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <p>Select a lobby to invite this friend to:</p>
          <div class="lobby-list">
            ${lobbies.map(lobby => `
              <div class="lobby-option" data-lobby-id="${lobby._id}">
                <h3>${lobby.name}</h3>
                <p>${lobby.game} | ${lobby.players.length}/${lobby.maxPlayers} players</p>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel-invite" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    
    // Create and display modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Show modal
    setTimeout(() => {
      modalContainer.style.display = 'flex';
    }, 50);
    
    // Add event listeners
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
      closeModal(modalContainer);
    });
    
    modalContainer.querySelector('#cancel-invite').addEventListener('click', () => {
      closeModal(modalContainer);
    });
    
    // Add event listeners to lobby options
    const lobbyOptions = modalContainer.querySelectorAll('.lobby-option');
    lobbyOptions.forEach(option => {
      option.addEventListener('click', async () => {
        const lobbyId = option.getAttribute('data-lobby-id');
        try {
          await inviteFriendToLobby(friendId, lobbyId);
          showNotification(`Invitation sent to ${friendName}!`, 'success');
        } catch (error) {
          showNotification(`Failed to send invitation: ${error.message}`, 'error');
        }
        closeModal(modalContainer);
      });
    });
  }).catch(error => {
    console.error('Error fetching lobbies:', error);
    showNotification('Failed to load your lobbies. Please try again later.', 'error');
  });
}

/**
 * Fetch user's lobbies
 * @returns {Promise} - Promise resolving to array of lobbies
 */
async function fetchUserLobbies() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/lobbies/my-lobbies', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch lobbies');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    return [];
  }
}

/**
 * Close modal helper
 * @param {HTMLElement} modalElement - Modal element to close
 */
function closeModal(modalElement) {
  modalElement.style.opacity = '0';
  setTimeout(() => {
    document.body.removeChild(modalElement);
  }, 300);
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Initialize the profile page when DOM content is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if we have a user ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    // Create a global flag that can be checked by other scripts
    window.VIEWING_OTHER_PROFILE = !!userId;
    window.PROFILE_USER_ID = userId || null;
    
    // For testing purposes - allow using a 'test_id' parameter
    const testId = urlParams.get('test_id');
    if (testId) {
      console.log('Using test ID override:', testId);
      
      // Also set global flags for test mode
      window.VIEWING_OTHER_PROFILE = true;
      window.PROFILE_USER_ID = testId;
      
      // Create a debug button to show request details
      const debugButton = document.createElement('button');
      debugButton.textContent = 'Show Debug Info';
      debugButton.className = 'btn btn-secondary';
      debugButton.style.position = 'fixed';
      debugButton.style.bottom = '10px';
      debugButton.style.right = '10px';
      debugButton.style.zIndex = '9999';
      
      debugButton.addEventListener('click', () => {
        const debugInfo = document.createElement('div');
        debugInfo.className = 'debug-info';
        debugInfo.style.position = 'fixed';
        debugInfo.style.bottom = '60px';
        debugInfo.style.right = '10px';
        debugInfo.style.backgroundColor = 'rgba(0,0,0,0.8)';
        debugInfo.style.color = 'white';
        debugInfo.style.padding = '15px';
        debugInfo.style.borderRadius = '5px';
        debugInfo.style.maxWidth = '80%';
        debugInfo.style.zIndex = '9999';
        debugInfo.style.overflowY = 'auto';
        debugInfo.style.maxHeight = '80vh';
        
        debugInfo.innerHTML = `
          <h3>Debug Information</h3>
          <p><strong>Test ID:</strong> ${testId}</p>
          <p><strong>API URL:</strong> ${window.APP_CONFIG.API_URL}/users/${testId}</p>
          <button id="fetch-test-profile">Fetch Profile Data</button>
          <pre id="api-response" style="margin-top: 10px; padding: 5px; background: #444; max-height: 300px; overflow: auto;"></pre>
          <button id="close-debug" style="margin-top: 10px;">Close</button>
        `;
        
        document.body.appendChild(debugInfo);
        
        document.getElementById('close-debug').addEventListener('click', () => {
          document.body.removeChild(debugInfo);
        });
        
        document.getElementById('fetch-test-profile').addEventListener('click', async () => {
          try {
            const response = await fetch(`${window.APP_CONFIG.API_URL}/users/${testId}`);
            const data = await response.json();
            document.getElementById('api-response').textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            document.getElementById('api-response').textContent = `Error: ${error.message}`;
          }
        });
      });
      
      document.body.appendChild(debugButton);
      
      // Try to load the test profile
      try {
        showNotification('Using test profile ID', 'info');
        const testProfile = await getProfileByUserId(testId);
        updateProfileUI(testProfile);
        
        // Hide edit button as this is a test profile
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
          editProfileBtn.style.display = 'none';
        }
        
        // Set up a mutation observer to protect against UI being changed back to current user profile
        setupProfileProtection(testProfile);
        
        return; // Skip the regular profile loading
      } catch (error) {
        console.error('Error loading test profile:', error);
        showNotification(`Test profile error: ${error.message}`, 'error');
      }
    }
    
    let profile;
    let isOwnProfile = true;
    
    console.log('Profile page loaded. URL params:', urlParams.toString());
    console.log('User ID from URL:', userId);
    
    // If we have a user ID, load that user's profile
    if (userId) {
      try {
        console.log('Loading profile for user ID:', userId);
        
        // Use getProfileByUserId function to load the specified user's profile
        profile = await getProfileByUserId(userId);
        
        if (!profile) {
          throw new Error('Profile data not returned for ID: ' + userId);
        }
        
        isOwnProfile = false;
        console.log('Loaded other user profile:', profile);
        
        // Capture the profile data in a global variable to allow restoration if needed
        window.LOADED_PROFILE_DATA = profile;
        
        // Hide the edit profile button for other users' profiles
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
          editProfileBtn.style.display = 'none';
        }
        
        // Change page title to show we're viewing someone else's profile
        document.querySelector('.page-title h1').textContent = 'USER PROFILE';
        document.title = `${profile.displayName || profile.user?.username || 'User'}'s Profile | GameSquad`;
        
        // Set up a mutation observer to protect against UI being changed back to current user profile
        setupProfileProtection(profile);
        
      } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification(`Could not load user profile: ${error.message}`, 'error');
        
        // DON'T automatically fallback to loading own profile
        // This might be confusing users by showing their own profile
        // when they expect to see someone else's profile
        
        // Show error state instead
        const displayNameElement = document.getElementById('profile-display-name');
        if (displayNameElement) {
          displayNameElement.textContent = 'Profile Not Found';
        }
        
        const usernameElement = document.getElementById('profile-username');
        if (usernameElement) {
          usernameElement.textContent = 'The requested profile could not be loaded';
        }
        
        const bioElement = document.getElementById('profile-bio');
        if (bioElement) {
          bioElement.textContent = 'Please check the profile ID and try again.';
        }
        
        return; // Exit early instead of continuing with own profile
      }
    } else {
      // Load own profile if no ID specified
      try {
        profile = await getMyProfile();
        console.log('Profile data loaded successfully:', profile);
      } catch (profileError) {
        console.error('Error loading profile data:', profileError);
        // Fallback to minimal profile data from localStorage
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          profile = userInfo.profile || {
            user: {
              _id: userInfo._id,
              username: userInfo.username,
              email: userInfo.email
            }
          };
          console.log('Using fallback profile data from localStorage');
        } else {
          // If no data available, show error and redirect to login
          showNotification('Unable to load profile data. Please login again.', 'error');
          setTimeout(() => {
            window.location.href = '/pages/login.html';
          }, 2000);
          return;
        }
      }
    }
    
    // Update UI with profile data
    updateProfileUI(profile);
    
    // Only load friends list for own profile
    if (isOwnProfile) {
      // Load friends list with error handling
      try {
        // First check if the friends-list container exists before trying to fetch friends
        const friendsContainer = document.getElementById('friends-list');
        if (!friendsContainer) {
          console.log('No friends list container found in the DOM, skipping friends fetch');
        } else {
          const friends = await getFriends();
          console.log('Friends data loaded:', friends);
          updateFriendsUI(friends);
        }
      } catch (friendsError) {
        console.error('Error loading friends:', friendsError);
        // Don't let friends error block the rest of the profile
        showNotification('Could not load friends list', 'warning');
        // Still update UI with empty array to show proper empty state
        const friendsContainer = document.getElementById('friends-list');
        if (friendsContainer) {
          updateFriendsUI([]);
        }
      }
    }
    
    // Set up tab switching
    setupTabs();
    
  } catch (error) {
    console.error('Unhandled error in profile initialization:', error);
    showNotification(`Error initializing profile page: ${error.message}`, 'error');
  }
});

/**
 * Update UI with profile data
 * @param {Object} profile - Profile data
 */
function updateProfileUI(profile) {
  if (!profile) {
    console.error('No profile data provided to updateProfileUI');
    return;
  }
  
  console.log('Updating UI with profile data:', profile);
  
  // Handle various profile data structures safely
  const user = profile.user || profile || {};
  const displayName = profile.displayName || (user.displayName || user.username || 'User');
  const username = user.username || '';
  const bio = profile.bio || '';
  
  // Update display name
  const displayNameElement = document.getElementById('profile-display-name');
  if (displayNameElement) {
    displayNameElement.textContent = displayName;
  }
  
  // Update username
  const usernameElement = document.getElementById('profile-username');
  if (usernameElement) {
    usernameElement.textContent = username ? `@${username}` : '';
  }
  
  // Update bio
  const bioElement = document.getElementById('profile-bio');
  if (bioElement) {
    bioElement.textContent = bio || 'No bio provided';
  }
  
  // Update avatar
  const profileAvatar = document.getElementById('profile-avatar');
  if (profileAvatar) {
    const avatarUrl = profile.avatar || '../resources/default-avatar.png';
    profileAvatar.src = avatarUrl;
    profileAvatar.onerror = () => {
      profileAvatar.src = '../resources/default-avatar.png';
    };
  }
  
  // Update join date
  const joinedElement = document.getElementById('profile-joined');
  if (joinedElement) {
    if (profile.createdAt || user.createdAt) {
      const date = new Date(profile.createdAt || user.createdAt);
      joinedElement.textContent = `Joined: ${date.toLocaleDateString()}`;
    } else {
      joinedElement.textContent = 'Joined: Recently';
    }
  }
  
  // Update games played
  const gamesPlayedElement = document.getElementById('profile-games-played');
  if (gamesPlayedElement) {
    const gamesPlayed = profile.gamesPlayed || 0;
    gamesPlayedElement.textContent = `Games: ${gamesPlayed}`;
  }
  
  // Update game ranks - safely handle different structures
  updateGameRanksUI(profile.gameRanks || []);
  
  // Update languages
  updateLanguagesUI(profile.languages || []);
  
  // Update interests
  updateInterestsUI(profile.interests || []);
  
  // Update preferences
  updatePreferencesUI(profile.preferences || {});
}

/**
 * Update game ranks UI
 * @param {Array} gameRanks - Array of game ranks
 */
function updateGameRanksUI(gameRanks) {
  const gameRanksContainer = document.getElementById('game-ranks-container');
  if (!gameRanksContainer) return;
  
  if (!gameRanks || !Array.isArray(gameRanks) || gameRanks.length === 0) {
    gameRanksContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-gamepad"></i>
        <p>No game ranks added yet</p>
      </div>
    `;
    return;
  }
  
  // Clear container
  gameRanksContainer.innerHTML = '';
  
  // Add game ranks
  gameRanks.forEach(gameRank => {
    if (!gameRank || !gameRank.game) return;
    
    const gameRankCard = document.createElement('div');
    gameRankCard.className = 'game-rank-card';
    gameRankCard.innerHTML = `
      <h4>${gameRank.game}</h4>
      <div class="rank-badge">${gameRank.rank || 'Unranked'}</div>
    `;
    gameRanksContainer.appendChild(gameRankCard);
  });
}

/**
 * Update languages UI
 * @param {Array} languages - Array of languages
 */
function updateLanguagesUI(languages) {
  const languagesContainer = document.getElementById('languages-container');
  if (!languagesContainer) return;
  
  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    languagesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-comment-slash"></i>
        <p>No languages added</p>
      </div>
    `;
    return;
  }
  
  // Clear container
  languagesContainer.innerHTML = '';
  
  // Add languages
  languages.forEach(language => {
    if (!language) return;
    
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = language;
    languagesContainer.appendChild(tag);
  });
}

/**
 * Update interests UI
 * @param {Array} interests - Array of interests
 */
function updateInterestsUI(interests) {
  const interestsContainer = document.getElementById('interests-container');
  if (!interestsContainer) return;
  
  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    interestsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-heart-broken"></i>
        <p>No interests added</p>
      </div>
    `;
    return;
  }
  
  // Clear container
  interestsContainer.innerHTML = '';
  
  // Add interests
  interests.forEach(interest => {
    if (!interest) return;
    
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = interest;
    interestsContainer.appendChild(tag);
  });
}

/**
 * Update preferences UI
 * @param {Object} preferences - Preferences object
 */
function updatePreferencesUI(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    preferences = {};
  }
  
  // Play style
  const playStyleElement = document.getElementById('pref-play-style');
  if (playStyleElement) {
    playStyleElement.textContent = preferences.playStyle || 'Casual';
  }
  
  // Communication
  const communicationElement = document.getElementById('pref-communication');
  if (communicationElement) {
    communicationElement.textContent = preferences.communication || 'Text Chat';
  }
  
  // Play time
  const playTimeElement = document.getElementById('pref-play-time');
  if (playTimeElement) {
    playTimeElement.textContent = preferences.playTime || 'Evening';
  }
  
  // Region
  const regionElement = document.getElementById('pref-region');
  if (regionElement) {
    regionElement.textContent = preferences.region || 'North America';
  }
}

/**
 * Set up event listeners for profile editing
 */
function setupProfileEventListeners() {
  // This function will be implemented based on the actual UI elements
  // For now, it's a placeholder
  console.log('Setting up profile event listeners');
  
  // Example of setting up event listeners
  const editProfileForm = document.getElementById('edit-profile-form');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      try {
        // Get form data
        const formData = new FormData(editProfileForm);
        const profileData = {
          bio: formData.get('bio'),
          // Add other fields as needed
        };
        
        // Update profile
        const updatedProfile = await createOrUpdateProfile(profileData);
        
        // Update UI
        updateProfileUI(updatedProfile);
        
        // Show success notification
        showNotification('Profile updated successfully!', 'success');
      } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Failed to update profile. Please try again.', 'error');
      }
    });
  }
}

/**
 * Set up tab switching functionality
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabButtons.length === 0 || tabContents.length === 0) {
    console.log('No tabs found to set up');
    return;
  }
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to current button and content
      button.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Set first tab as active by default
  if (tabButtons[0] && tabContents[0]) {
    tabButtons[0].classList.add('active');
    tabContents[0].classList.add('active');
  }
}

/**
 * Sets up protection to prevent profile UI from being overwritten by other scripts
 * @param {Object} profileData - The profile data to protect
 */
function setupProfileProtection(profileData) {
  if (!profileData) return;
  
  console.log('Setting up profile protection to prevent overwriting');
  
  // Create a warning banner that shows up if other scripts try to mess with the profile
  const warningBanner = document.createElement('div');
  warningBanner.className = 'profile-protection-warning';
  warningBanner.style.display = 'none';
  warningBanner.style.position = 'fixed';
  warningBanner.style.top = '10px';
  warningBanner.style.left = '50%';
  warningBanner.style.transform = 'translateX(-50%)';
  warningBanner.style.backgroundColor = 'rgba(255, 30, 30, 0.9)';
  warningBanner.style.color = 'white';
  warningBanner.style.padding = '10px 20px';
  warningBanner.style.borderRadius = '5px';
  warningBanner.style.zIndex = '10000';
  warningBanner.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  warningBanner.style.maxWidth = '80%';
  warningBanner.style.textAlign = 'center';
  
  warningBanner.innerHTML = `
    <p><strong>Profile Data Overwrite Detected!</strong></p>
    <p>Another script is trying to change this profile back to your own profile.</p>
    <button id="restore-profile" style="margin-top: 5px; padding: 5px 10px;">Restore Correct Profile</button>
  `;
  
  document.body.appendChild(warningBanner);
  
  document.getElementById('restore-profile').addEventListener('click', () => {
    updateProfileUI(profileData);
    warningBanner.style.display = 'none';
  });
  
  // Store the original profile values
  const originalValues = {
    displayName: profileData.displayName || (profileData.user?.displayName || profileData.user?.username || 'User'),
    username: profileData.user?.username || '',
    bio: profileData.bio || ''
  };
  
  // Setup a mutation observer to monitor changes to the profile elements
  // Get the key profile elements
  const displayNameElement = document.getElementById('profile-display-name');
  const usernameElement = document.getElementById('profile-username');
  const bioElement = document.getElementById('profile-bio');
  
  // If any of these elements exist, monitor them for changes
  if (displayNameElement || usernameElement || bioElement) {
    const observer = new MutationObserver((mutations) => {
      let needsRestore = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' || mutation.type === 'childList') {
          const target = mutation.target;
          
          // Check if displayName was changed
          if (displayNameElement && 
              (target === displayNameElement || displayNameElement.contains(target)) &&
              displayNameElement.textContent !== originalValues.displayName) {
            console.warn('Profile displayName was changed by another script!', {
              from: originalValues.displayName,
              to: displayNameElement.textContent
            });
            needsRestore = true;
          }
          
          // Check if username was changed
          if (usernameElement && 
              (target === usernameElement || usernameElement.contains(target)) &&
              usernameElement.textContent !== (originalValues.username ? `@${originalValues.username}` : '')) {
            console.warn('Profile username was changed by another script!', {
              from: originalValues.username ? `@${originalValues.username}` : '',
              to: usernameElement.textContent
            });
            needsRestore = true;
          }
          
          // Check if bio was changed
          if (bioElement && 
              (target === bioElement || bioElement.contains(target)) &&
              bioElement.textContent !== (originalValues.bio || 'No bio provided')) {
            console.warn('Profile bio was changed by another script!', {
              from: originalValues.bio || 'No bio provided',
              to: bioElement.textContent
            });
            needsRestore = true;
          }
        }
      }
      
      if (needsRestore) {
        console.warn('Profile data was overwritten, showing restoration banner');
        warningBanner.style.display = 'block';
      }
    });
    
    // Start observing all profile elements that exist
    const config = { characterData: true, childList: true, subtree: true };
    
    if (displayNameElement) observer.observe(displayNameElement, config);
    if (usernameElement) observer.observe(usernameElement, config);
    if (bioElement) observer.observe(bioElement, config);
    
    console.log('Profile protection observer set up for', {
      displayName: !!displayNameElement,
      username: !!usernameElement,
      bio: !!bioElement
    });
  } else {
    console.warn('Could not set up profile protection - no profile elements found');
  }
}

// Export functions
window.Profile = {
  getMyProfile,
  createOrUpdateProfile,
  addGameRank,
  removeGameRank,
  updateLanguages,
  updateInterests,
  updatePreferences,
  updateSocialLinks,
  addActivity,
  getProfileByUserId,
  getAllProfiles,
  setupTabs
};

// Add this function at the end of the file
document.addEventListener('DOMContentLoaded', function() {
    // Parse URL parameters to check if we're viewing another profile
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');

    if (userId) {
        console.log(`Profile.js: Detected userId in URL: ${userId}`);
        
        // Make sure we can detect when the userId is invalid (not a valid MongoDB ObjectId)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
        if (!isValidObjectId) {
            console.warn(`Profile.js: Invalid user ID format: ${userId}`);
            
            // Show error message on the profile page
            setTimeout(() => {
                document.getElementById('profile-display-name').textContent = 'Invalid User ID';
                document.getElementById('profile-bio').textContent = 'The requested user ID is not in a valid format.';
                
                // Add error message with explanation
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>The user ID "${userId}" is not in a valid format.</p>
                    <p>Please return to the <a href="players.html">players list</a> and try again.</p>
                `;
                
                // Add error message to the profile info section
                const profileInfo = document.querySelector('.profile-info');
                if (profileInfo) {
                    const profileBio = document.getElementById('profile-bio');
                    if (profileBio && profileBio.parentNode) {
                        profileBio.parentNode.insertBefore(errorElement, profileBio.nextSibling);
                    } else {
                        profileInfo.appendChild(errorElement);
                    }
                }
                
                // Hide edit profile button since we're viewing an invalid profile
                const editProfileBtn = document.getElementById('edit-profile-btn');
                if (editProfileBtn) {
                    editProfileBtn.style.display = 'none';
                }
                
                // Update the page title and heading
                document.title = 'Invalid Profile | GameSquad';
                const pageTitle = document.querySelector('.page-title h1');
                if (pageTitle) {
                    pageTitle.textContent = 'INVALID PROFILE';
                }
            }, 100);
            
            return;
        }
        
        // Override the loadUserProfile function to ensure it loads the correct profile
        window.loadUserProfile = async function() {
            console.log(`Profile.js: Using custom loadUserProfile for user ID: ${userId}`);
            try {
                // Show loading state
                document.getElementById('profile-display-name').textContent = 'Loading...';
                document.getElementById('profile-bio').textContent = 'Loading bio...';
                
                // Fetch the profile data for the specified user ID
                const userData = await getProfileByUserId(userId);
                
                if (!userData) {
                    console.error('Failed to load profile data for user ID:', userId);
                    document.getElementById('profile-display-name').textContent = 'Profile Not Found';
                    document.getElementById('profile-bio').textContent = 'Could not load profile data. Please try again later.';
                    
                    // Show more detailed error message
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>There was a problem loading this profile. This may be due to:</p>
                        <ul>
                            <li>The user profile doesn't exist</li>
                            <li>Network connection issues</li>
                            <li>Server-side error</li>
                        </ul>
                        <p>You can <a href="players.html">return to the players list</a> or <button onclick="window.loadUserProfile()">try again</button>.</p>
                    `;
                    
                    // Add error message below profile display name
                    const profileInfo = document.querySelector('.profile-info');
                    if (profileInfo) {
                        // Insert after profile-bio
                        const profileBio = document.getElementById('profile-bio');
                        if (profileBio && profileBio.parentNode) {
                            profileBio.parentNode.insertBefore(errorElement, profileBio.nextSibling);
                        } else {
                            profileInfo.appendChild(errorElement);
                        }
                    }
                    
                    return;
                }
                
                console.log('Profile.js: Successfully loaded profile data for user ID:', userId);
                
                // Set global flag to prevent other scripts from overriding
                window.VIEWING_OTHER_PROFILE = true;
                window.PROFILE_USER_ID = userId;
                
                // Update UI with profile data
                updateProfileUI(userData);
                
                // Hide edit profile button since we're viewing someone else's profile
                const editProfileBtn = document.getElementById('edit-profile-btn');
                if (editProfileBtn) {
                    editProfileBtn.style.display = 'none';
                }
                
                // Set page title to reflect we're viewing someone else's profile
                document.title = `${userData.displayName || userData.username}'s Profile | GameSquad`;
                
                // Update the page heading
                const pageTitle = document.querySelector('.page-title h1');
                if (pageTitle) {
                    pageTitle.textContent = 'USER PROFILE';
                }
                
                // Setup profile protection to prevent other scripts from overriding our data
                setupProfileProtection(userData);
            } catch (error) {
                console.error('Error in custom loadUserProfile:', error);
                document.getElementById('profile-display-name').textContent = 'Error Loading Profile';
                document.getElementById('profile-bio').textContent = `An error occurred: ${error.message}`;
            }
        };
        
        // Call it immediately in case DOMContentLoaded already fired
        window.loadUserProfile();
    }
});

// Function to protect profile data from being overwritten
function setupProfileProtection(userData) {
    // Create a MutationObserver to watch for changes to the profile elements
    const profileDisplayName = document.getElementById('profile-display-name');
    const profileUsername = document.getElementById('profile-username');
    const profileBio = document.getElementById('profile-bio');
    
    if (!profileDisplayName || !profileUsername || !profileBio) {
        console.error('Profile elements not found, cannot setup protection');
        return;
    }
    
    // Store the correct values
    const correctName = userData.displayName || userData.username;
    const correctUsername = userData.username ? `@${userData.username}` : '';
    const correctBio = userData.bio || 'No bio available';
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                // Check if the content was changed by another script
                const currentElement = mutation.target;
                
                if (currentElement === profileDisplayName && 
                    currentElement.textContent !== correctName &&
                    currentElement.textContent !== 'Loading...') {
                    console.log('Profile protection: Restoring display name');
                    currentElement.textContent = correctName;
                }
                
                if (currentElement === profileUsername && 
                    currentElement.textContent !== correctUsername &&
                    currentElement.textContent !== '@username') {
                    console.log('Profile protection: Restoring username');
                    currentElement.textContent = correctUsername;
                }
                
                if (currentElement === profileBio && 
                    currentElement.textContent !== correctBio &&
                    currentElement.textContent !== 'Loading bio...') {
                    console.log('Profile protection: Restoring bio');
                    currentElement.textContent = correctBio;
                }
            }
        });
    });
    
    // Configure the observer to watch for changes to the text content
    const config = { characterData: true, childList: true, subtree: true };
    
    // Start observing
    observer.observe(profileDisplayName, config);
    observer.observe(profileUsername, config);
    observer.observe(profileBio, config);
    
    console.log('Profile protection set up for user ID:', userData._id);
}
