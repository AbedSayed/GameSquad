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

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles/me`, {
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
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/profiles`, {
      method: 'POST',
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

// Initialize profile page
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in
  if (!Auth.isLoggedIn()) {
    // Redirect to login page if not logged in
    window.location.href = '/pages/login.html';
    return;
  }

  try {
    // Load profile data
    const profile = await getMyProfile();
    
    // Update UI with profile data
    updateProfileUI(profile);
    
    // Set up event listeners for profile editing
    setupProfileEventListeners();
  } catch (error) {
    console.error('Profile initialization error:', error);
    showNotification('Failed to load profile. Please try again.', 'error');
  }
});

/**
 * Update UI with profile data
 * @param {Object} profile - Profile data
 */
function updateProfileUI(profile) {
  // This function will be implemented based on the actual UI elements
  // For now, it's a placeholder
  console.log('Profile data loaded:', profile);
  
  // Example of updating UI elements
  const displayNameElement = document.getElementById('display-name');
  if (displayNameElement) {
    displayNameElement.textContent = profile.user.displayName || profile.user.username;
  }
  
  const usernameElement = document.getElementById('username');
  if (usernameElement) {
    usernameElement.textContent = '@' + profile.user.username;
  }
  
  // Update game ranks
  updateGameRanksUI(profile.gameRanks);
  
  // Update languages
  updateLanguagesUI(profile.languages);
  
  // Update interests
  updateInterestsUI(profile.interests);
  
  // Update preferences
  updatePreferencesUI(profile.preferences);
  
  // Update recent activity
  updateActivityUI(profile.recentActivity);
}

/**
 * Update game ranks UI
 * @param {Array} gameRanks - Array of game ranks
 */
function updateGameRanksUI(gameRanks) {
  // Placeholder function
  console.log('Updating game ranks UI:', gameRanks);
}

/**
 * Update languages UI
 * @param {Array} languages - Array of languages
 */
function updateLanguagesUI(languages) {
  // Placeholder function
  console.log('Updating languages UI:', languages);
}

/**
 * Update interests UI
 * @param {Array} interests - Array of interests
 */
function updateInterestsUI(interests) {
  // Placeholder function
  console.log('Updating interests UI:', interests);
}

/**
 * Update preferences UI
 * @param {Object} preferences - Preferences object
 */
function updatePreferencesUI(preferences) {
  // Placeholder function
  console.log('Updating preferences UI:', preferences);
}

/**
 * Update activity UI
 * @param {Array} activities - Array of activities
 */
function updateActivityUI(activities) {
  // Placeholder function
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
  getAllProfiles
};
