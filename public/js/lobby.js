// Initialize the window.Lobby namespace immediately
// Make it globally available
window.Lobby = window.Lobby || {};

// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

// Ensure APP_CONFIG exists and has default values if not already defined
if (!window.APP_CONFIG) {
    window.APP_CONFIG = {};
}

// Set default API URL if not defined
if (!window.APP_CONFIG.API_URL) {
    console.warn('APP_CONFIG.API_URL was not defined. Setting default to /api');
    window.APP_CONFIG.API_URL = '/api';
}

// Log the configured API URL for debugging
console.log('Using API URL:', window.APP_CONFIG.API_URL);

/**
 * Create a new lobby
 * @param {Object} lobbyData - Lobby data
 * @returns {Promise} - Promise resolving to created lobby
 */
window.Lobby.createLobby = async function(lobbyData) {
  try {
    const userInfo = window.Lobby.getUserInfo();
    const token = userInfo?.token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${window.APP_CONFIG.API_URL}/lobbies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(lobbyData),
    });

    return window.Lobby.handleApiError(response, await response.json());
  } catch (error) {
    console.error('Create lobby error:', error);
    throw error;
  }
};

/**
 * Get all lobbies with optional filters
 * @param {Object} filters - Optional filters to apply
 * @returns {Promise<Array>} - Array of lobbies
 */
window.Lobby.getLobbies = async function(filters = {}) {
  console.log('Fetching lobbies with filters:', filters);
  
  try {
    // Build URL with query parameters if filters provided
    let url = '/api/lobbies';
    if (Object.keys(filters).length > 0) {
      const queryParams = new URLSearchParams();
      
      // Add each filter as a query parameter
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      }
      
      // Append query parameters to URL if any
      const queryString = queryParams.toString();
      if (queryString) {
        url += '?' + queryString;
      }
    }
    
    console.log('Fetching lobbies from URL:', url);
    
    // Make the request to get lobbies
    console.log('Starting lobby fetch request...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Lobby fetch response status:', response.status);
    console.log('Lobby fetch response ok:', response.ok);
    
    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from server:', errorText);
      throw new Error(`Failed to fetch lobbies. Status: ${response.status}. Details: ${errorText || 'No details provided'}`);
    }
    
    // Parse response JSON
    console.log('Parsing JSON response...');
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    // Try to parse as JSON if it's not empty
    let data = [];
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        console.error('Invalid JSON text:', responseText);
        throw new Error('Failed to parse server response as JSON');
      }
    }
    
    console.log('Fetched lobbies:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching lobbies:', error);
    throw error;
  }
};

/**
 * Get a lobby by ID
 * @param {string} lobbyId - Lobby ID
 * @returns {Promise<Object>} - Lobby data
 */
window.Lobby.getLobbyById = async function(lobbyId) {
  console.log('Fetching lobby with ID:', lobbyId);
  
  try {
    const response = await fetch(`/api/lobbies/${lobbyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch lobby. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Fetched lobby:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching lobby:', error);
    throw error;
  }
};

/**
 * Get messages for a lobby
 * @param {string} lobbyId - Lobby ID
 * @returns {Promise<Array>} - Array of messages
 */
window.Lobby.getMessages = async function(lobbyId) {
  console.log('Fetching messages for lobby:', lobbyId);
  
  try {
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to view messages');
    }
    
    const response = await fetch(`/api/lobbies/${lobbyId}/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch messages. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Fetched messages:', data);
    
    return data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Send a message in a lobby
 * @param {string} lobbyId - Lobby ID
 * @param {string} message - Message text
 * @returns {Promise<Object>} - Created message
 */
window.Lobby.sendMessage = async function(lobbyId, message) {
  console.log(`Sending message to lobby ${lobbyId}:`, message);
  
  try {
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to send messages');
    }
    
    const response = await fetch(`/api/lobbies/${lobbyId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text: message })
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send message. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Message sent:', data);
    
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Join a lobby
 * @param {string} lobbyId - Lobby ID
 * @param {string} password - Optional password for private lobbies
 * @returns {Promise<Object>} - Updated lobby data
 */
window.Lobby.joinLobby = async function(lobbyId, password = null) {
  console.log('Joining lobby:', lobbyId);
  
  try {
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to join lobbies');
    }
    
    // Prepare request body
    const requestBody = {};
    if (password) {
      requestBody.password = password;
    }
    
    const response = await fetch(`/api/lobbies/${lobbyId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to join lobby. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Joined lobby:', data);
    
    return data;
  } catch (error) {
    console.error('Error joining lobby:', error);
    throw error;
  }
};

/**
 * Leave a lobby
 * @param {string} lobbyId - Lobby ID
 * @returns {Promise<Object>} - Response data
 */
window.Lobby.leaveLobby = async function(lobbyId) {
  console.log('Leaving lobby:', lobbyId);
  
  try {
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to leave lobbies');
    }
    
    const response = await fetch(`/api/lobbies/${lobbyId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to leave lobby. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Left lobby:', data);
    
    return data;
  } catch (error) {
    console.error('Error leaving lobby:', error);
    throw error;
  }
};

/**
 * Delete a lobby (host only)
 * @param {string} lobbyId - Lobby ID
 * @returns {Promise<Object>} - Response data
 */
window.Lobby.deleteLobby = async function(lobbyId) {
  console.log('Deleting lobby:', lobbyId);
  
  try {
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to delete lobbies');
    }
    
    const response = await fetch(`/api/lobbies/${lobbyId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete lobby. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Deleted lobby:', data);
    
    return data;
  } catch (error) {
    console.error('Error deleting lobby:', error);
    throw error;
  }
};

/**
 * Update a lobby
 * @param {string} lobbyId - Lobby ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated lobby data
 */
window.Lobby.updateLobby = async function(lobbyId, updateData) {
  console.log('Updating lobby:', lobbyId, updateData);
  
  try {
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required to update lobbies');
    }
    
    const response = await fetch(`/api/lobbies/${lobbyId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update lobby. Status: ${response.status}`);
    }
    
    // Parse response JSON
    const data = await response.json();
    console.log('Updated lobby:', data);
    
    return data;
  } catch (error) {
    console.error('Error updating lobby:', error);
    throw error;
  }
};

/**
 * Get user info from localStorage
 * @returns {Object|null} - User info or null if not logged in
 */
window.Lobby.getUserInfo = function() {
  try {
    const userInfoString = localStorage.getItem('userInfo');
    if (!userInfoString) {
      console.log('No user info found in localStorage');
      return null;
    }
    
    const userInfo = JSON.parse(userInfoString);
    
    // Add consistent formatting of username for display
    userInfo.displayName = userInfo.username || (userInfo.user && userInfo.user.username) || 'User';
    
    console.log('User info loaded:', userInfo);
    return userInfo;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

/**
 * Handle API errors in a consistent way
 * @param {Response} response - Fetch API response
 * @param {Object} data - Response data
 * @throws {Error} - Throws an error with the appropriate message
 */
window.Lobby.handleApiError = function(response, data) {
  if (!response.ok) {
    // Try to extract a meaningful error message
    const errorMessage = 
      data.error || 
      data.message || 
      (data.errors && data.errors.length > 0 ? data.errors[0].msg : null) || 
      `API error (${response.status})`;
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

/**
 * Add notification to page
 * @param {string} message - Message to show
 * @param {string} type - Type of notification (success, error, info)
 */
window.Lobby.showNotification = function(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="close-btn">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add to notification container or create one if it doesn't exist
  let notificationContainer = document.querySelector('.notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  notificationContainer.appendChild(notification);
  
  // Add event listener to close button
  notification.querySelector('.close-btn').addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 5000);
};

/**
 * Function to detect if we're on the lobbies page
 */
window.Lobby.isLobbiesPage = function() {
  return document.getElementById('lobbies-container') !== null;
};

/**
 * Mock lobbies for testing when API is not available
 */
window.Lobby.MOCK_LOBBIES = [
  {
    _id: 'mock-lobby-1',
    name: 'Pro Gamers Only',
    gameType: 'FPS',
    host: { username: 'ProGamer123', _id: 'user1' },
    currentPlayers: 2,
    maxPlayers: 4,
    status: 'waiting',
    description: 'Looking for skilled players for competitive matches!',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() // 15 minutes ago
  },
  {
    _id: 'mock-lobby-2',
    name: 'Casual Fun',
    gameType: 'RPG',
    host: { username: 'CasualGamer', _id: 'user2' },
    currentPlayers: 3,
    maxPlayers: 5,
    status: 'waiting',
    description: 'Just looking to have some fun and meet new players!',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString() // 35 minutes ago
  },
  {
    _id: 'mock-lobby-3',
    name: 'Tournament Practice',
    gameType: 'MOBA',
    host: { username: 'TournamentPro', _id: 'user3' },
    currentPlayers: 5,
    maxPlayers: 5,
    status: 'full',
    description: 'Practicing for the upcoming tournament!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
  }
];

/**
 * Helper function to load lobbies (can be called after filter changes)
 */
window.Lobby.loadLobbies = async function(filters = {}) {
  try {
    console.log('Loading lobbies with filters:', filters);
    
    // Show loading state
    const lobbiesContainer = document.getElementById('lobbies-container') || document.querySelector('.lobbies-grid');
    if (lobbiesContainer) {
      lobbiesContainer.innerHTML = '<div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading lobbies...</div>';
    } else {
      console.error('Lobbies container not found!');
      return;
    }
    
    try {
      // Try to get lobbies from API first
      console.log('Attempting to fetch lobbies from API...');
      const lobbies = await window.Lobby.getLobbies(filters);
      console.log('API response for lobbies:', lobbies);
      
      // If we got a valid response with lobbies, use them
      if (lobbies && (Array.isArray(lobbies) || (lobbies.data && Array.isArray(lobbies.data)) || (lobbies.lobbies && Array.isArray(lobbies.lobbies)))) {
        console.log('Using API lobby data');
        window.Lobby.updateLobbiesUI(lobbies);
        return;
      }
      
      // If we get here, the API response didn't contain valid lobby data
      console.warn('API returned invalid lobby data format, falling back to mock data');
      throw new Error('Invalid lobby data format from API');
    } catch (apiError) {
      console.error('API error, using mock lobbies instead:', apiError);
      
      // Filter mock lobbies similar to how the API would
      let filteredMockLobbies = [...window.Lobby.MOCK_LOBBIES];
      
      if (filters.game) {
        filteredMockLobbies = filteredMockLobbies.filter(
          lobby => lobby.gameType.toLowerCase() === filters.game.toLowerCase()
        );
      }
      
      if (filters.status) {
        filteredMockLobbies = filteredMockLobbies.filter(
          lobby => lobby.status.toLowerCase() === filters.status.toLowerCase()
        );
      }
      
      // Show notification about using mock data
      window.Lobby.showNotification(
        'Using demo lobby data since the API is unavailable. Some features may be limited.',
        'info'
      );
      
      // Update UI with mock lobbies
      window.Lobby.updateLobbiesUI(filteredMockLobbies);
    }
  } catch (error) {
    console.error('Error loading lobbies:', error);
    window.Lobby.showNotification('Failed to load lobbies. Please check your connection.', 'error');
    
    // Show empty state
    window.Lobby.updateLobbiesUI([]);
  }
};

/**
 * Update lobbies UI
 * @param {Array} lobbies - Array of lobby objects
 */
window.Lobby.updateLobbiesUI = function(lobbies) {
  console.log('Updating lobbies UI with:', lobbies);
  
  // Find the container element
  const lobbiesContainer = document.getElementById('lobbies-container') || document.querySelector('.lobbies-grid');
  if (!lobbiesContainer) {
    console.error('Lobbies container not found!');
    return;
  }
  
  // Clear previous content
  lobbiesContainer.innerHTML = '';
  
  // Process lobbies data
  let lobbiesArray = lobbies;
  
  // Handle different API response formats
  if (lobbies && !Array.isArray(lobbies)) {
    if (lobbies.data && Array.isArray(lobbies.data)) {
      lobbiesArray = lobbies.data;
    } else if (lobbies.lobbies && Array.isArray(lobbies.lobbies)) {
      lobbiesArray = lobbies.lobbies;
    }
  }
  
  console.log('Processed lobbies array:', lobbiesArray);
  
  // Check if we have lobbies to display
  if (!lobbiesArray || lobbiesArray.length === 0) {
    console.log('No lobbies to display');
    lobbiesContainer.innerHTML = `
      <div class="no-lobbies" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: var(--secondary-color);"></i>
        <h3>No Lobbies Found</h3>
        <p>Be the first to create a lobby!</p>
        <a href="create-lobby.html" class="btn btn-primary">Create Lobby</a>
      </div>
    `;
    return;
  }
  
  // Render each lobby card
  lobbiesArray.forEach(lobby => {
    try {
      console.log('Creating card for lobby:', lobby);
      const lobbyCard = window.Lobby.createLobbyCard(lobby);
      if (lobbyCard) {
        lobbiesContainer.appendChild(lobbyCard);
      }
    } catch (error) {
      console.error('Error creating lobby card:', error, lobby);
    }
  });
};

// Add this function to format the details
function formatGameDetail(value, type) {
    if (!value || value === 'any') return 'Any';
    
    switch (type) {
        case 'rank':
            return value.split(/[-_]/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        case 'region':
            const regionMap = {
                'na': 'North America',
                'eu': 'Europe',
                'asia': 'Asia',
                'oceania': 'Oceania',
                'sa': 'South America'
            };
            return regionMap[value.toLowerCase()] || value;
        case 'language':
            return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        case 'status':
            // Properly capitalize the status value
            return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        default:
            return value;
    }
}

// Add system message to the chat
function addSystemMessage(text) {
    console.log('System message:', text);
    
    // If chat messages container doesn't exist, just log to console
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.warn('Chat messages container not found, cannot display message:', text);
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message system-message';
    
    messageElement.innerHTML = `
        <div class="message-content">${text}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update the addChatMessage function to handle system messages
function addChatMessage(message, currentUserInfo) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    // Add system message class if it's a system message
    if (message.isSystem) {
        messageElement.classList.add('system-message');
    } else if (currentUserInfo && message.username === currentUserInfo.username) {
        messageElement.classList.add('own-message');
    }
    
    // Format differently for system messages
    if (message.isSystem) {
        messageElement.innerHTML = `
            <div class="message-content">${message.text}</div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.username || 'Anonymous'}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${message.text}</div>
        `;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Create a lobby card element
 * @param {Object} lobby - Lobby data
 * @returns {HTMLElement} - The lobby card element
 */
function createLobbyCard(lobby) {
    // Get current user info
    const userInfo = localStorage.getItem('userInfo');
    const currentUser = userInfo ? JSON.parse(userInfo) : null;
    const isHost = currentUser && lobby.host && currentUser._id === lobby.host._id;
    
    // Create the card element
    const card = document.createElement('div');
    card.className = 'lobby-card';
    card.dataset.id = lobby._id;
    
    // Format the game type and create game icon
    const gameType = lobby.gameType || 'Unknown';
    const gameIcon = `<img src="../assets/${gameType.toLowerCase()}-icon.png" alt="${gameType}" class="game-icon" onerror="this.src='../assets/default-game-icon.png';">`;
    
    // Format other details
    const playerCount = `${lobby.currentPlayers || 0}/${lobby.maxPlayers || 5}`;
    const hostName = lobby.host ? lobby.host.username : 'Unknown';
    
    // Format the rank
    let rankDisplay = 'Any Rank';
    if (lobby.rank && lobby.rank !== 'any') {
        rankDisplay = formatGameDetail(lobby.rank, 'rank');
    } else {
        // Set a data attribute to update the rank later
        card.dataset.needsHostRank = 'true';
        card.dataset.hostId = lobby.host?._id;
        card.dataset.gameType = gameType;
    }
    
    // Format the region
    const regionDisplay = (lobby.region && lobby.region !== 'any') 
        ? formatGameDetail(lobby.region, 'region') 
        : 'Any Region';
    
    // Format the language
    const languageDisplay = (lobby.language && lobby.language !== 'any')
        ? formatGameDetail(lobby.language, 'language')
        : 'Any Language';
    
    // Set the card HTML content
    card.innerHTML = `
        <div class="lobby-header">
            <div class="game-info">
                ${gameIcon}
                <h3 class="lobby-name">${lobby.name || 'Unnamed Lobby'}</h3>
            </div>
            <div class="lobby-status ${lobby.status || 'waiting'}">
                ${formatGameDetail(lobby.status || 'waiting', 'status')}
            </div>
        </div>
        <div class="lobby-details">
            <div class="detail-item">
                <i class="fas fa-users"></i>
                <span>${playerCount}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-crown"></i>
                <span>${hostName}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-trophy"></i>
                <span class="rank-display">${rankDisplay}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-globe"></i>
                <span>${regionDisplay}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-language"></i>
                <span>${languageDisplay}</span>
            </div>
        </div>
        <div class="lobby-actions">
            ${!isHost ? 
                `<button class="join-lobby-btn">Join</button>` : 
                `<button class="manage-lobby-btn">Manage</button>`
            }
            <button class="details-lobby-btn">Details</button>
        </div>
    `;
    
    // Add event listener to buttons
    const joinButton = card.querySelector('.join-lobby-btn');
    if (joinButton) {
        joinButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `lobby.html?id=${lobby._id}`;
        });
    }
    
    const manageButton = card.querySelector('.manage-lobby-btn');
    if (manageButton) {
        manageButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `lobby.html?id=${lobby._id}`;
        });
    }
    
    const detailsButton = card.querySelector('.details-lobby-btn');
    if (detailsButton) {
        detailsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `lobby.html?id=${lobby._id}`;
        });
    }
    
    // Add event listener to the card itself
    card.addEventListener('click', () => {
        window.location.href = `lobby.html?id=${lobby._id}`;
    });
    
    // If we need to fetch the host rank, do it
    if (card.dataset.needsHostRank === 'true' && lobby.host?._id) {
        fetchHostGameRank(lobby.host._id, gameType)
            .then(rank => {
                if (rank) {
                    const rankDisplay = card.querySelector('.rank-display');
                    if (rankDisplay) {
                        rankDisplay.textContent = formatGameDetail(rank, 'rank');
                    }
                }
            })
            .catch(err => {
                console.error('Error fetching host rank:', err);
            });
    }
    
    return card;
}

/**
 * Fetch a user's game rank
 * @param {string} userId - The user ID
 * @param {string} gameType - The game type
 * @returns {Promise<string>} - The user's rank for the game
 */
async function fetchHostGameRank(userId, gameType) {
    try {
        const response = await fetch(`/api/profiles/user/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch host profile');
        }
        
        const profile = await response.json();
        
        // Check if the user has a rank for the specified game
        if (profile.gameRanks && profile.gameRanks.length > 0) {
            const gameRank = profile.gameRanks.find(gr => 
                gr.game.toLowerCase() === gameType.toLowerCase());
            
            if (gameRank) {
                return gameRank.rank;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching host game rank:', error);
        return null;
    }
}

// ONLY ONE DOMContentLoaded EVENT LISTENER in the entire file
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing chat');
    
    // Get lobby ID from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('id');
    
    console.log('Detected lobby ID:', lobbyId);
    
    if (!lobbyId) {
        console.error('No lobby ID found in URL');
        addSystemMessage('Error: No lobby ID specified');
        return;
    }
    
    // Check if we're joining this lobby
    const isJoining = urlParams.get('join') === 'true';
    const fromInvite = urlParams.get('fromInvite') === 'true';
    
    if (isJoining) {
        console.log('Join parameter detected, will attempt to join the lobby');
        
        // Function to handle joining the lobby
        const joinCurrentLobby = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error('No token found, cannot join lobby');
                    addSystemMessage('Please log in to join lobbies');
                    return;
                }
                
                console.log('Joining lobby with ID:', lobbyId);
                
                // Add additional logging if joining from an invite
                if (fromInvite) {
                    console.log('User is joining from an invite');
                    // Try to get invite info from localStorage
                    try {
                        const invitesString = localStorage.getItem('invites');
                        if (invitesString) {
                            const invites = JSON.parse(invitesString);
                            const relevantInvite = invites.find(invite => invite.lobbyId === lobbyId);
                            if (relevantInvite) {
                                console.log('Found matching invite in localStorage:', relevantInvite);
                            }
                        }
                    } catch (err) {
                        console.warn('Error checking invites in localStorage:', err);
                    }
                }
                
                // Call the joinLobby API function
                const response = await fetch(`/api/lobbies/${lobbyId}/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `Failed to join lobby. Status: ${response.status}`;
                    console.error('Error joining lobby:', errorMessage);
                    addSystemMessage(`Error joining lobby: ${errorMessage}`);
                    return;
                }
                
                const data = await response.json();
                console.log('Successfully joined lobby:', data);
                
                // Different messages based on join source
                if (fromInvite) {
                    addSystemMessage('You have joined the lobby from an invitation!');
                } else {
                    addSystemMessage('You have joined the lobby!');
                }
                
                // Remove the join parameter from URL to avoid rejoining on page refresh
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('join');
                newUrl.searchParams.delete('fromInvite');
                window.history.replaceState({}, '', newUrl);
                
                // Refresh lobby details to show updated player list
                await fetchLobbyDetails();
                
                // If we joined from an invite, also clean up that invite
                if (fromInvite) {
                    try {
                        const invitesString = localStorage.getItem('invites');
                        if (invitesString) {
                            const invites = JSON.parse(invitesString);
                            // Filter out the invite for this lobby
                            const updatedInvites = invites.filter(invite => invite.lobbyId !== lobbyId);
                            localStorage.setItem('invites', JSON.stringify(updatedInvites));
                            console.log('Removed accepted invite from localStorage');
                        }
                    } catch (err) {
                        console.warn('Error cleaning up invite from localStorage:', err);
                    }
                }
            } catch (error) {
                console.error('Error in joinCurrentLobby:', error);
                addSystemMessage(`Error joining lobby: ${error.message}`);
            }
        };
        
        // Call the join function
        joinCurrentLobby();
    }
    
    // Get user information - try multiple sources
    let userInfo = null;
    
    // Method 1: Try to get from Auth module
    if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
        userInfo = window.Auth.getCurrentUser();
        console.log('Got user info from Auth module:', userInfo);
    }
    
    // Method 2: Try to get from localStorage userInfo
    if (!userInfo) {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                userInfo = JSON.parse(userInfoStr);
                console.log('Got user info from localStorage userInfo:', userInfo);
            }
        } catch (e) {
            console.error('Error parsing userInfo from localStorage:', e);
        }
    }
    
    // Method 3: Try to get from token
    if (!userInfo || !userInfo.username) {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // Try to decode the token
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                console.log('Token payload:', payload);
                
                // Extract user info from token payload
                if (!userInfo) userInfo = {};
                userInfo.id = userInfo.id || payload.id || payload.userId || payload.sub;
                userInfo.username = userInfo.username || payload.username || payload.name || payload.preferred_username;
                
                console.log('Updated user info from token:', userInfo);
            }
        } catch (error) {
            console.error('Error getting user info from token:', error);
        }
    }
    
    // If we still don't have a username, check other localStorage values
    if (!userInfo || !userInfo.username) {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                if (!userInfo) userInfo = {};
                userInfo.id = userInfo.id || userData.id || userData._id;
                userInfo.username = userInfo.username || userData.username || userData.name;
                console.log('Got user info from localStorage user:', userInfo);
            }
        } catch (e) {
            console.error('Error parsing user from localStorage:', e);
        }
    }
    
    // Display the username in the header if available
    if (userInfo && userInfo.username) {
        const usernameSpan = document.querySelector('.nav-user .username');
        if (usernameSpan) {
            usernameSpan.textContent = userInfo.username;
        }
    }
    
    // Fetch and display lobby details
    async function fetchLobbyDetails() {
        try {
            console.log('Fetching lobby details for ID:', lobbyId);
            
            const response = await fetch(`/api/lobbies/${lobbyId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch lobby: ${response.status}`);
            }
            
            const data = await response.json();
            const lobby = data.data || data;
            
            console.log('Fetched lobby details:', lobby);
            
            // Update lobby name
            const lobbyNameElement = document.getElementById('lobbyName')?.querySelector('span');
            if (lobbyNameElement) {
                lobbyNameElement.textContent = lobby.name || 'Unnamed Lobby';
            }
            
            // Update lobby status
            const lobbyStatusElement = document.getElementById('lobbyStatus')?.querySelector('span');
            if (lobbyStatusElement) {
                lobbyStatusElement.textContent = lobby.status || 'waiting';
            }
            
            // Update game type
            const gameTypeElement = document.getElementById('gameType');
            if (gameTypeElement) {
                gameTypeElement.textContent = lobby.gameType || 'Unknown';
            }
            
            // Update player count
            const playerCountElement = document.getElementById('playerCount');
            if (playerCountElement) {
                playerCountElement.textContent = `${lobby.players?.length || 0}/${lobby.maxPlayers || 4}`;
            }
            
            // Update host name
            const hostNameElement = document.getElementById('hostName');
            if (hostNameElement) {
                const hostName = lobby.host?.username || 'Unknown';
                hostNameElement.textContent = hostName;
            }
            
            // Update new fields: Rank
            const rankElement = document.getElementById('lobbyRank');
            if (rankElement) {
                // If lobby has a specific rank set
                if (lobby.rank && lobby.rank !== 'any' && lobby.rank !== 'Any') {
                    rankElement.textContent = formatGameDetail(lobby.rank, 'rank');
                } 
                // If lobby host has a rank for this game, use that instead
                else if (lobby.host && lobby.host._id) {
                    fetchHostGameRank(lobby.host._id, lobby.gameType)
                        .then(hostRank => {
                            if (hostRank) {
                                rankElement.textContent = formatGameDetail(hostRank, 'rank');
                            } else {
                                rankElement.textContent = 'Any';
                            }
                        })
                        .catch(err => {
                            console.error('Error fetching host rank:', err);
                            rankElement.textContent = 'Any';
                        });
                } else {
                    rankElement.textContent = 'Any';
                }
            }
            
            // Update new fields: Language
            const languageElement = document.getElementById('lobbyLanguage');
            if (languageElement) {
                if (lobby.language && lobby.language !== 'any' && lobby.language !== 'Any') {
                    languageElement.textContent = formatGameDetail(lobby.language, 'language');
                } else if (lobby.host && lobby.host.profile && lobby.host.profile.language) {
                    // Use host's preferred language if available
                    languageElement.textContent = formatGameDetail(lobby.host.profile.language, 'language');
                } else {
                    languageElement.textContent = 'Any';
                }
            }
            
            // Update new fields: Status Detail
            const statusDetailElement = document.getElementById('lobbyStatusDetail');
            if (statusDetailElement) {
                const statusText = lobby.status || 'waiting';
                // Capitalize the status text for better display
                statusDetailElement.textContent = formatGameDetail(statusText, 'status');
                // Use standard info-value class to match other detail fields
                statusDetailElement.className = 'info-value';
            }
            
            // Update new fields: Region
            const regionElement = document.getElementById('lobbyRegion');
            if (regionElement) {
                if (lobby.region && lobby.region !== 'any' && lobby.region !== 'Any') {
                    regionElement.textContent = formatGameDetail(lobby.region, 'region');
                } else if (lobby.host && lobby.host.profile && lobby.host.profile.region) {
                    // Use host's region if available
                    regionElement.textContent = formatGameDetail(lobby.host.profile.region, 'region');
                } else {
                    regionElement.textContent = 'Any';
                }
            }
            
            // Update players list
            const playersListElement = document.querySelector('.players-list');
            if (playersListElement && lobby.players) {
                playersListElement.innerHTML = '';
                
                lobby.players.forEach(player => {
                    const playerItem = document.createElement('div');
                    playerItem.className = 'player-item';
                    
                    // Check if player is the host
                    const isHost = lobby.host?._id === player.user?._id;
                    const isCurrentUser = userInfo && (userInfo.id === player.user?._id);
                    
                    playerItem.innerHTML = `
                        <i class="fas fa-user${isHost ? '-crown' : ''}"></i>
                        <span class="player-name${isCurrentUser ? ' current-user' : ''}">${player.user?.username || 'Unknown'}</span>
                        <span class="player-status ${player.ready ? 'text-success' : 'text-warning'}">
                            <i class="fas ${player.ready ? 'fa-check' : 'fa-clock'}"></i>
                            ${player.ready ? 'Ready' : 'Not Ready'}
                        </span>
                    `;
                    
                    playersListElement.appendChild(playerItem);
                });
            }
            
            // Update UI based on user role
            if (userInfo) {
                const isHost = lobby.host?._id === userInfo.id;
                const readyToggleBtn = document.getElementById('readyToggleBtn');
                
                if (readyToggleBtn) {
                    const isReady = lobby.players?.find(p => p.user?._id === userInfo.id)?.ready;
                    updateReadyUI(isReady);
                }
            }

            // Make sure ready toggle is initialized after updating UI
            setTimeout(ensureReadyToggleInitialized, 100);
        } catch (error) {
            console.error('Error fetching lobby details:', error);
            addSystemMessage('Error loading lobby details. Refresh to try again.');
        }
    }
    
    // Fetch message history
    async function fetchMessageHistory() {
        try {
            console.log('Fetching message history for lobby:', lobbyId);
            
            // Make request without authentication headers - we've modified the backend to not require auth
            const response = await fetch(`/api/lobbies/${lobbyId}/messages`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch message history: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Fetched message history:', data);
            
            // Clear existing welcome message
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // Display message history
            if (data.data && data.data.length > 0) {
                data.data.forEach(message => {
                    addChatMessage({
                        username: message.username,
                        text: message.text,
                        timestamp: message.timestamp,
                        isSystem: message.isSystem
                    }, userInfo);
                });
                
                // Add welcome message after history is loaded
                if (userInfo && userInfo.username) {
                    addSystemMessage(`Welcome to the lobby, ${userInfo.username}!`);
                } else {
                    addSystemMessage('Welcome to the lobby! (You are not logged in)');
                }
            } else {
                // If no messages, just show welcome
                if (userInfo && userInfo.username) {
                    addSystemMessage(`Welcome to the lobby, ${userInfo.username}!`);
                } else {
                    addSystemMessage('Welcome to the lobby! (You are not logged in)');
                }
            }
        } catch (error) {
            console.error('Error fetching message history:', error);
            // Still show welcome message on error
            if (userInfo && userInfo.username) {
                addSystemMessage(`Welcome to the lobby, ${userInfo.username}!`);
            } else {
                addSystemMessage('Welcome to the lobby! (You are not logged in)');
            }
        }
    }
    
    // Initialize Socket.IO connection
    try {
        // Track if this is our own connection
        let initialJoin = true;
        let mySocketId = null;
        
        const socket = io();
        console.log('Socket initialized:', socket);
        
        // Join the lobby socket room
        if (lobbyId) {
            socket.emit('join-lobby', { lobbyId });
            console.log('Joined lobby room:', lobbyId);
            
            // Store our socket ID once connected
            socket.on('connect', function() {
                mySocketId = socket.id;
                console.log('Connected with socket ID:', mySocketId);
            });
            
            // Fetch message history after joining
            fetchMessageHistory();
        }
        
        // Listen for chat messages
        socket.on('chat-message', function(message) {
            console.log('Received chat message:', message);
            addChatMessage(message, userInfo);
        });
        
        // Listen for user joined event
        socket.on('user-joined', function(data) {
            console.log('User joined lobby:', data);
            
            // Only show the notification if it's not our own join event
            // and not during initial page load
            if (data.socketId !== mySocketId && !initialJoin) {
                addSystemMessage(`A new player joined the lobby`);
            }
            
            // Set initialJoin to false after first join event
            initialJoin = false;
            
            // Always refresh lobby details
            fetchLobbyDetails();
        });
        
        // Listen for user left event
        socket.on('user-left', function(data) {
            console.log('User left lobby:', data);
            
            // Only show message if it's not our own socket
            if (data.socketId !== mySocketId) {
                addSystemMessage(`A player left the lobby`);
            }
            
            fetchLobbyDetails(); // Refresh lobby data
        });
        
        // Listen for player-joined event (from invite accept)
        socket.on('player-joined', function(data) {
            console.log('Player joined lobby via invite:', data);
            
            // Show notification about the new player
            if (data.username) {
                addSystemMessage(`${data.username} joined the lobby via invitation`);
            } else {
                addSystemMessage(`A new player joined the lobby via invitation`);
            }
            
            // Refresh the lobby details to show the new player
            fetchLobbyDetails();
        });
        
        // Set up chat functions
        function sendMessage() {
            const chatInput = document.getElementById('chatInput');
            if (!chatInput) {
                console.error('Chat input not found during sendMessage call');
                return;
            }
            
            const messageText = chatInput.value.trim();
            console.log('Attempting to send message:', messageText);
            
            if (messageText) {
                // Create message data
                const messageData = {
                    lobbyId: lobbyId,
                    message: messageText,
                    username: userInfo && userInfo.username ? userInfo.username : 'Anonymous',
                    userId: userInfo ? userInfo.id : null  // Add user ID for database storage
                };
                
                console.log('Emitting message data:', messageData);
                socket.emit('send-message', messageData);
                chatInput.value = '';
            }
        }
        
        // Set up ready toggle button functionality
        const readyToggleBtn = document.getElementById('readyToggleBtn');
        const yourStatusBadge = document.getElementById('yourStatus');
        if (readyToggleBtn && yourStatusBadge) {
            // Track current ready state
            let isReady = false;
            
            // Update UI based on ready state
            function updateReadyUI(ready) {
                isReady = ready;
                
                if (ready) {
                    // Ready state
                    readyToggleBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Ready';
                    readyToggleBtn.classList.remove('not-ready');
                    readyToggleBtn.classList.add('ready');
                    
                    yourStatusBadge.textContent = 'Not Ready';
                    yourStatusBadge.classList.remove('ready');
                    yourStatusBadge.classList.add('not-ready');
                } else {
                    // Not ready state
                    readyToggleBtn.innerHTML = '<i class="fas fa-times"></i> Mark as Not Ready';
                    readyToggleBtn.classList.remove('ready');
                    readyToggleBtn.classList.add('not-ready');
                    
                    yourStatusBadge.textContent = 'Ready';
                    yourStatusBadge.classList.remove('not-ready');
                    yourStatusBadge.classList.add('ready');
                }
            }
            
            // Initial UI update
            updateReadyUI(false);
            
            // Add click handler
            readyToggleBtn.addEventListener('click', async function() {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        addSystemMessage("Please log in to use this feature");
                        return;
                    }
                    
                    // Enhanced debugging - show API call being made
                    console.log('=== READY STATUS DEBUG ===');
                    console.log('1. Button clicked, current status:', isReady);
                    console.log('2. About to toggle to:', !isReady);
                    
                    // Show loading indicator
                    const statusIndicator = document.getElementById('buttonStatusIndicator');
                    if (statusIndicator) {
                        statusIndicator.textContent = 'Updating status...';
                        statusIndicator.style.color = '#ffa500';
                    }
                    
                    // Don't update UI until we get server confirmation
                    // updateReadyUI(!isReady);
                    
                    console.log('3. Making API call to update server before updating UI');
                    
                    // Make API call to update server-side status
                    const response = await fetch(`/api/lobbies/${lobbyId}/ready`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        console.log('4. API call FAILED:', await response.text());
                        if (statusIndicator) {
                            statusIndicator.textContent = 'Failed to update status';
                            statusIndicator.style.color = '#ff0000';
                        }
                        throw new Error('Failed to update ready status');
                    }
                    
                    console.log('4. API call successful');
                    
                    // Now update UI based on the new server state
                    const data = await response.json();
                    const updatedLobby = data.data || data;
                    
                    // Find current player's ready status from server data
                    const currentPlayer = updatedLobby.players.find(p => p.user?._id === userInfo.id);
                    if (currentPlayer) {
                        console.log('5. Updating UI based on server response:', currentPlayer.ready);
                        updateReadyUI(currentPlayer.ready);
                        
                        if (statusIndicator) {
                            statusIndicator.textContent = `Status updated: ${currentPlayer.ready ? 'Ready' : 'Not Ready'}`;
                            statusIndicator.style.color = '#4CAF50';
                            
                            // Reset status indicator after 2 seconds
                            setTimeout(() => {
                                statusIndicator.textContent = 'Ready for next update';
                                statusIndicator.style.color = '#666';
                            }, 2000);
                        }
                        
                        // Notify user
                        addSystemMessage(`You are now ${currentPlayer.ready ? 'ready' : 'not ready'}`);
                    } else {
                        console.log('5. Could not find current player in updated lobby data');
                        if (statusIndicator) {
                            statusIndicator.textContent = 'Status unclear - refreshing';
                            statusIndicator.style.color = '#ff9900';
                        }
                    }
                    
                    // Still fetch lobby details to ensure everything is in sync
                    console.log('6. Refreshing lobby details');
                    fetchLobbyDetails();
                } catch (error) {
                    console.error('Error updating ready status:', error);
                    addSystemMessage("Error updating ready status");
                    // Refresh to reset UI if error occurred
                    fetchLobbyDetails();
                }
            });
            
            // Update with current status on lobby update
            function updateFromLobbyData(lobby) {
                console.log('=== UPDATING FROM LOBBY DATA ===');
                console.log('Lobby data received:', lobby);
                
                if (!userInfo || !userInfo.id) {
                    console.log('Missing user info, cannot update status');
                    return;
                }

                if (!lobby || !lobby.players || !Array.isArray(lobby.players)) {
                    console.log('Invalid lobby data, cannot update status');
                    return;
                }
                
                console.log('Looking for current player with ID:', userInfo.id);
                console.log('Available players:', lobby.players.map(p => ({ id: p.user?._id, name: p.user?.username, ready: p.ready })));
                
                const currentPlayer = lobby.players.find(p => p.user?._id === userInfo.id);
                
                if (currentPlayer) {
                    console.log('Found current player:', currentPlayer);
                    console.log('Setting ready status to:', currentPlayer.ready || false);
                    updateReadyUI(currentPlayer.ready || false);
                } else {
                    console.log('Could not find current player in lobby data');
                }
            }
            
            // Hook into fetchLobbyDetails
            const originalFetchLobbyDetails = fetchLobbyDetails;
            fetchLobbyDetails = async function() {
                const result = await originalFetchLobbyDetails.apply(this, arguments);
                // Update ready status based on fetched data
                try {
                    const response = await fetch(`/api/lobbies/${lobbyId}`);
                    if (response.ok) {
                        const data = await response.json();
                        const lobby = data.data || data;
                        updateFromLobbyData(lobby);
                    }
                } catch (e) {
                    console.error("Error updating ready status from lobby data", e);
                }
                return result;
            };
        }
        
        // Add debug info for ready functionality
        console.log('Ready status elements:', {
            readyToggleBtn: !!readyToggleBtn,
            yourStatusBadge: !!yourStatusBadge,
            userInfo: userInfo
        });
        
        // Add direct test function for ready toggle API
        window.testReadyToggle = async function() {
            try {
                console.log('=== DIRECT READY TOGGLE TEST ===');
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('No token found for API call');
                    addSystemMessage("Please log in to use this feature");
                    return;
                }
                
                console.log('Making direct API call to toggle ready status');
                const response = await fetch(`/api/lobbies/${lobbyId}/ready`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const responseText = await response.text();
                
                if (!response.ok) {
                    console.log('API call FAILED:', responseText);
                    addSystemMessage("Error updating ready status in test");
                    return;
                }
                
                console.log('API call successful, response:', responseText);
                addSystemMessage("Test ready toggle successful - refreshing");
                fetchLobbyDetails();
            } catch (error) {
                console.error('Error in test ready toggle:', error);
                addSystemMessage("Error in test ready toggle");
            }
        };
        
        // Ensure initial state is updated right away, for all players including host
        fetchLobbyDetails();
        
        // Set up leave button functionality
        const leaveBtn = document.getElementById('leaveBtn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', async function() {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        addSystemMessage("Please log in to use this feature");
                        return;
                    }
                    
                    const response = await fetch(`/api/lobbies/${lobbyId}/leave`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to leave lobby');
                    }
                    
                    socket.emit('leave-lobby', { lobbyId });
                    window.location.href = '/pages/lobbies.html';
                } catch (error) {
                    console.error('Error leaving lobby:', error);
                    addSystemMessage("Error leaving lobby");
                }
            });
        }
        
        // Attach event listeners for chat
        const sendButton = document.getElementById('sendMessage');
        const chatInput = document.getElementById('chatInput');
        
        if (sendButton) {
            console.log('Found send button, attaching click handler');
            sendButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Send button clicked');
                sendMessage();
            });
        } else {
            console.error('Send button not found');
        }
        
        if (chatInput) {
            console.log('Found chat input, attaching keypress handler');
            chatInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    console.log('Enter key pressed in chat input');
                    sendMessage();
                }
            });
        } else {
            console.error('Chat input not found');
        }
        
        // Debug info
        console.log('Chat elements connected:', {
            chatInput: !!chatInput,
            sendButton: !!sendButton,
            messagesContainer: !!document.querySelector('.chat-messages')
        });
        
        // Make functions available globally for debugging
        window.debugSocket = socket;
        window.debugUserInfo = userInfo;
        window.debugSendMessage = sendMessage;
        
        // Fetch lobby details
        fetchLobbyDetails();
        
        console.log('Chat initialization complete');
        
    } catch (error) {
        console.error('Error initializing Socket.IO or chat:', error);
    }

    // Function to ensure ready toggle button is initialized - must be called after lobby is loaded
    function ensureReadyToggleInitialized() {
        console.log('Ensuring ready toggle button is initialized');
        
        const readyToggleBtn = document.getElementById('readyToggleBtn');
        const yourStatusBadge = document.getElementById('yourStatus');
        
        if (!readyToggleBtn || !yourStatusBadge) {
            console.error('Ready toggle button or status badge not found in DOM');
            addSystemMessage("Error: UI elements for ready status not found");
            return false;
        }
        
        // Check if event listener already exists
        const hasEventListeners = readyToggleBtn.hasAttribute('data-has-listener');
        
        if (!hasEventListeners) {
            console.log('Adding event listener to ready toggle button');
            
            // Add click handler
            readyToggleBtn.addEventListener('click', async function() {
                try {
                    console.log('Ready toggle button clicked');
                    const token = localStorage.getItem('token');
                    if (!token) {
                        addSystemMessage("Please log in to use this feature");
                        return;
                    }
                    
                    // Get current state
                    const currentState = readyToggleBtn.classList.contains('ready');
                    console.log('Current ready state:', currentState);
                    
                    // Directly update UI
                    let newStatus;
                    if (currentState) {
                        // Going from ready to not ready - currentState is "ready"
                        readyToggleBtn.innerHTML = '<i class="fas fa-check"></i> Mark as Ready';
                        readyToggleBtn.classList.remove('ready');
                        readyToggleBtn.classList.add('not-ready');
                        
                        yourStatusBadge.textContent = 'Not Ready';
                        yourStatusBadge.classList.remove('ready');
                        yourStatusBadge.classList.add('not-ready');
                        
                        newStatus = 'not ready';
                    } else {
                        // Going from not ready to ready - currentState is "not-ready"
                        readyToggleBtn.innerHTML = '<i class="fas fa-times"></i> Mark as Not Ready';
                        readyToggleBtn.classList.remove('not-ready');
                        readyToggleBtn.classList.add('ready');
                        
                        yourStatusBadge.textContent = 'Ready';
                        yourStatusBadge.classList.remove('not-ready');
                        yourStatusBadge.classList.add('ready');
                        
                        newStatus = 'ready';
                    }
                    
                    // Make API call
                    console.log('Making API call to update ready status');
                    const response = await fetch(`/api/lobbies/${lobbyId}/ready`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to update ready status');
                    }
                    
                    // Notify user
                    addSystemMessage(`You are now ${newStatus}`);
                    
                    // Refresh lobby data
                    fetchLobbyDetails();
                } catch (error) {
                    console.error('Error updating ready status:', error);
                    addSystemMessage("Error updating ready status");
                    // Refresh to reset UI if error occurred
                    fetchLobbyDetails();
                }
            });
            
            // Mark as having listeners
            readyToggleBtn.setAttribute('data-has-listener', 'true');
            return true;
        } else {
            console.log('Ready toggle button already has event listener');
            return true;
        }
    }

    // Call once after the page loads
    setTimeout(ensureReadyToggleInitialized, 2000); // Give time for all elements to load

    // Add help functions to global scope for debugging in console
    window.lobbyHelpers = {
        testReadyToggle: window.testReadyToggle,
        
        // Manual toggle for ready status
        forceToggleReady: async function() {
            try {
                console.log('=== FORCE TOGGLE READY STATUS ===');
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('No token available, please log in');
                    return;
                }
                
                // Make direct API call
                const response = await fetch(`/api/lobbies/${lobbyId}/ready`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const text = await response.text();
                    console.error('API call failed:', text);
                    return false;
                }
                
                console.log('Ready status toggled successfully');
                fetchLobbyDetails();
                addSystemMessage('Ready status toggled. Check your new status and try the button again.');
                return true;
            } catch (error) {
                console.error('Error toggling ready status:', error);
                return false;
            }
        },
        
        // Force re-initialization of the ready button
        reinitializeReadyButton: function() {
            // Remove any existing listener
            const btn = document.getElementById('readyToggleBtn');
            if (btn) {
                console.log('Removing old event listeners');
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Ensure initialization
                return ensureReadyToggleInitialized();
            }
            return false;
        },
        
        // Get current user and lobby info
        getStatus: function() {
            return {
                userId: userInfo?.id,
                lobbyId: lobbyId,
                isHost: userInfo && lobby ? (lobby.host?._id === userInfo.id) : false,
                buttonPresent: !!document.getElementById('readyToggleBtn'),
                badgePresent: !!document.getElementById('yourStatus'),
                buttonState: document.getElementById('readyToggleBtn')?.classList.contains('ready') ? 'Ready' : 'Not Ready',
                eventListenerAttached: document.getElementById('readyToggleBtn')?.hasAttribute('data-has-listener') || false
            };
        }
    };

    // Show help message in console
    console.log('=== LOBBY READY STATUS DEBUGGER ===');
    console.log('For debugging, type any of these commands in the console:');
    console.log('window.lobbyHelpers.forceToggleReady() - Force toggle your ready status');
    console.log('window.lobbyHelpers.reinitializeReadyButton() - Refresh the ready button');
    console.log('window.lobbyHelpers.getStatus() - Get current status information');

    // Add a debug utility function to the window object
    window.debugLobbyStatus = async function(lobbyId) {
        try {
            console.log('=== LOBBY DEBUG TOOL ===');
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No auth token found');
                return { error: 'Not authenticated' };
            }
            
            console.log('Fetching debug info for lobby:', lobbyId);
            const response = await fetch(`/api/lobbies/${lobbyId}/debug`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Debug request failed:', errorText);
                return { error: 'Request failed', details: errorText };
            }
            
            const data = await response.json();
            console.log('Lobby Debug Data:', data);
            
            // Log a specific focus on the ready status
            if (data.success && data.debug) {
                const { currentPlayer, host, allPlayers } = data.debug;
                console.log('=== READY STATUS DEBUG ===');
                console.log('Current player:', currentPlayer);
                console.log('Is host:', host.isCurrentUser);
                console.log('All players ready status:', allPlayers.map(p => 
                    `${p.username}: ${p.ready ? 'READY' : 'NOT READY'}`
                ));
            }
            
            return data;
        } catch (error) {
            console.error('Debug function error:', error);
            return { error: error.message };
        }
    };

    // Run debug on page load for this specific lobby
    if (typeof lobbyId !== 'undefined') {
        setTimeout(() => {
            window.debugLobbyStatus(lobbyId);
        }, 2000);
    }

    // Add a fixLobbyStatus utility function to help with broken status
    window.fixLobbyStatus = async function(lobbyId) {
        try {
            console.log('=== LOBBY FIX TOOL ===');
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No auth token found');
                return { error: 'Not authenticated' };
            }
            
            console.log('Attempting to fix status for lobby:', lobbyId);
            const response = await fetch(`/api/lobbies/${lobbyId}/fix-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Fix request failed:', errorText);
                return { error: 'Request failed', details: errorText };
            }
            
            const data = await response.json();
            console.log('Lobby status fix result:', data);
            
            // If status was fixed, refresh the page to update UI
            if (data.success && data.message.includes('Fixed lobby status')) {
                console.log('Lobby status was fixed, refreshing page in 3 seconds...');
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }
            
            return data;
        } catch (error) {
            console.error('Status fix function error:', error);
            return { error: error.message };
        }
    };

    // Help text for console debugging
    console.log('=== LOBBY STATUS FIX TOOL ===');
    console.log('If ready button is not working due to status issues, run:');
    console.log('window.fixLobbyStatus("' + (typeof lobbyId !== 'undefined' ? lobbyId : 'your-lobby-id') + '")');

    // If this is a lobby page, check if we need to offer the status fix
    if (typeof lobbyId !== 'undefined') {
        // Check if there might be a status issue
        window.addEventListener('error', function(event) {
            if (event.message && event.message.includes('status')) {
                console.warn('Detected possible lobby status issue. Try running window.fixLobbyStatus("' + lobbyId + '")');
            }
        });
    }
});
