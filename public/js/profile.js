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
 * Get user profile by ID
 * @param {string} userId - User ID
 * @returns {Promise} - Promise resolving to profile data
 */
async function getProfileByUserId(userId) {
  try {
    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
      console.warn('Not authenticated, returning empty friends list');
      return [];
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
      console.warn('Server returned error when fetching friends:', data.message);
      return [];
    }

    // Ensure the returned data is an array
    if (!Array.isArray(data)) {
      console.warn('Server returned non-array friends data:', data);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Get friends error:', error);
    return []; // Return empty array instead of throwing
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
 * Update friends UI
 * @param {Array} friends - Array of friends
 */
function updateFriendsUI(friends) {
  const friendsContainer = document.getElementById('friends-list');
  
  if (!friendsContainer) {
    console.error('Friends container not found');
    return;
  }
  
  // Clear loading state
  friendsContainer.innerHTML = '';
  
  // Check if friends exists, is an array, and has elements
  if (!friends || !Array.isArray(friends) || friends.length === 0) {
    friendsContainer.innerHTML = '<p class="no-friends">You have not added any friends yet.</p>';
    return;
  }
  
  // Create a friend card for each friend
  friends.forEach(friend => {
    const friendCard = document.createElement('div');
    friendCard.className = 'friend-card';
    friendCard.setAttribute('data-friend-id', friend._id);
    
    // Get profile info
    const profile = friend.profile || {};
    const displayName = profile.displayName || friend.username || 'Unknown User';
    const avatar = profile.avatar || 'default-avatar.png';
    const isOnline = profile.isOnline || false;
    
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
      showLobbyInviteModal(friend._id, displayName);
    });
    
    const removeFriendBtn = friendCard.querySelector('.remove-friend-btn');
    removeFriendBtn.addEventListener('click', async () => {
      try {
        await removeFriend(friend._id);
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
  let profile = null;
  
  try {
    // Load profile data
    profile = await getMyProfile();
    
    // Update UI with profile data
    updateProfileUI(profile);
  } catch (error) {
    console.error('Error loading profile data:', error);
    showNotification(`Failed to load profile data: ${error.message}`, 'error');
  }
  
  try {
    // Load friends list - this is handled separately so issues with friends
    // don't prevent the rest of the profile from loading
    const friends = await getFriends();
    updateFriendsUI(friends);
  } catch (error) {
    console.error('Error loading friends list:', error);
    showNotification('Failed to load friends list', 'error');
    // Update with empty friends list if there's an error
    updateFriendsUI([]);
  }
  
  try {
    // Set up tab switching
    setupTabs();
  } catch (error) {
    console.error('Error setting up tabs:', error);
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
  
  console.log('Profile data loaded:', profile);
  
  // Make sure user data exists
  const user = profile.user || {};
  
  // Update display name
  const displayNameElement = document.getElementById('display-name');
  if (displayNameElement) {
    displayNameElement.textContent = user.displayName || user.username || 'Unknown User';
  }
  
  // Update username
  const usernameElement = document.getElementById('username');
  if (usernameElement) {
    usernameElement.textContent = user.username ? '@' + user.username : '';
  }
  
  // Update game ranks - safely handle if it's undefined
  updateGameRanksUI(profile.gameRanks);
  
  // Update languages - safely handle if it's undefined
  updateLanguagesUI(profile.languages);
  
  // Update interests - safely handle if it's undefined
  updateInterestsUI(profile.interests);
  
  // Update preferences - safely handle if it's undefined
  updatePreferencesUI(profile.preferences);
  
  // Update recent activity - safely handle if it's undefined
  updateActivityUI(profile.recentActivity);
}

/**
 * Update game ranks UI
 * @param {Array} gameRanks - Array of game ranks
 */
function updateGameRanksUI(gameRanks) {
  if (!gameRanks || !Array.isArray(gameRanks)) {
    console.log('No valid game ranks to display');
    return;
  }
  console.log('Updating game ranks UI:', gameRanks);
}

/**
 * Update languages UI
 * @param {Array} languages - Array of languages
 */
function updateLanguagesUI(languages) {
  if (!languages || !Array.isArray(languages)) {
    console.log('No valid languages to display');
    return;
  }
  console.log('Updating languages UI:', languages);
}

/**
 * Update interests UI
 * @param {Array} interests - Array of interests
 */
function updateInterestsUI(interests) {
  if (!interests || !Array.isArray(interests)) {
    console.log('No valid interests to display');
    return;
  }
  console.log('Updating interests UI:', interests);
}

/**
 * Update preferences UI
 * @param {Object} preferences - Preferences object
 */
function updatePreferencesUI(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    console.log('No valid preferences to display');
    return;
  }
  console.log('Updating preferences UI:', preferences);
}

/**
 * Update activity UI
 * @param {Array} activities - Array of activities
 */
function updateActivityUI(activities) {
  if (!activities || !Array.isArray(activities)) {
    console.log('No valid activities to display');
    return;
  }
  console.log('Updating activity UI:', activities);
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
