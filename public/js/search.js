// Search and filter related JavaScript functions

// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

if (!window.APP_CONFIG?.API_URL) {
    console.error('APP_CONFIG.API_URL is not defined. Make sure config.js is loaded first.');
}

/**
 * Search for users with filters
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

/**
 * Search for lobbies with filters
 * @param {Object} filters - Search filters
 * @returns {Promise} - Promise resolving to array of lobbies
 */
async function searchLobbies(filters = {}) {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    
    if (filters.game) queryParams.append('game', filters.game);
    if (filters.rank) queryParams.append('rank', filters.rank);
    if (filters.language) queryParams.append('language', filters.language);
    if (filters.status) queryParams.append('status', filters.status);
    
    const queryString = queryParams.toString();
    const url = `${window.APP_CONFIG.API_URL}/lobbies${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to search lobbies');
    }

    return data;
  } catch (error) {
    console.error('Search lobbies error:', error);
    throw error;
  }
}

/**
 * Get available games list
 * @returns {Array} - Array of game names
 */
function getAvailableGames() {
  // This could be fetched from an API in a real implementation
  return [
    'Counter-Strike: Global Offensive',
    'Valorant',
    'League of Legends',
    'Dota 2',
    'Overwatch',
    'Apex Legends',
    'Fortnite',
    'Rainbow Six Siege',
    'Rocket League'
  ];
}

/**
 * Get available ranks for a game
 * @param {string} game - Game name
 * @returns {Array} - Array of ranks
 */
function getAvailableRanks(game) {
  // This could be fetched from an API in a real implementation
  const ranksByGame = {
    'Counter-Strike: Global Offensive': [
      'Silver I', 'Silver II', 'Silver III', 'Silver IV', 'Silver Elite', 'Silver Elite Master',
      'Gold Nova I', 'Gold Nova II', 'Gold Nova III', 'Gold Nova Master',
      'Master Guardian I', 'Master Guardian II', 'Master Guardian Elite', 'Distinguished Master Guardian',
      'Legendary Eagle', 'Legendary Eagle Master', 'Supreme Master First Class', 'Global Elite'
    ],
    'Valorant': [
      'Iron 1', 'Iron 2', 'Iron 3',
      'Bronze 1', 'Bronze 2', 'Bronze 3',
      'Silver 1', 'Silver 2', 'Silver 3',
      'Gold 1', 'Gold 2', 'Gold 3',
      'Platinum 1', 'Platinum 2', 'Platinum 3',
      'Diamond 1', 'Diamond 2', 'Diamond 3',
      'Immortal 1', 'Immortal 2', 'Immortal 3',
      'Radiant'
    ],
    'default': ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Professional']
  };
  
  return ranksByGame[game] || ranksByGame.default;
}

/**
 * Get available languages
 * @returns {Array} - Array of languages
 */
function getAvailableLanguages() {
  return [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Turkish', 'Dutch', 'Swedish'
  ];
}

/**
 * Get available interests
 * @returns {Array} - Array of gaming interests
 */
function getAvailableInterests() {
  return [
    'Competitive', 'Casual', 'Streaming', 'Tournaments', 'Coaching',
    'Team Play', 'Solo Play', 'Strategy', 'FPS', 'MOBA', 'RPG', 'Battle Royale'
  ];
}

/**
 * Initialize search page
 */
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the search page
  const isSearchPage = window.location.pathname.includes('search.html');
  
  if (isSearchPage) {
    initializeSearchPage();
  }
});

/**
 * Initialize search page
 */
function initializeSearchPage() {
  // Populate filter options
  populateFilterOptions();
  
  // Set up event listeners for search forms
  setupSearchEventListeners();
  
  // Perform initial searches
  performInitialSearches();
}

/**
 * Populate filter options in select elements
 */
function populateFilterOptions() {
  // Populate game selects
  const gameSelects = document.querySelectorAll('.game-select');
  const games = getAvailableGames();
  
  gameSelects.forEach(select => {
    // Clear existing options
    select.innerHTML = '<option value="">All Games</option>';
    
    // Add game options
    games.forEach(game => {
      const option = document.createElement('option');
      option.value = game;
      option.textContent = game;
      select.appendChild(option);
    });
  });
  
  // Populate language selects
  const languageSelects = document.querySelectorAll('.language-select');
  const languages = getAvailableLanguages();
  
  languageSelects.forEach(select => {
    // Clear existing options
    select.innerHTML = '<option value="">All Languages</option>';
    
    // Add language options
    languages.forEach(language => {
      const option = document.createElement('option');
      option.value = language;
      option.textContent = language;
      select.appendChild(option);
    });
  });
  
  // Populate interest selects
  const interestSelects = document.querySelectorAll('.interest-select');
  const interests = getAvailableInterests();
  
  interestSelects.forEach(select => {
    // Clear existing options
    select.innerHTML = '<option value="">All Interests</option>';
    
    // Add interest options
    interests.forEach(interest => {
      const option = document.createElement('option');
      option.value = interest;
      option.textContent = interest;
      select.appendChild(option);
    });
  });
  
  // Set up rank select update when game changes
  gameSelects.forEach(gameSelect => {
    gameSelect.addEventListener('change', function() {
      // Find the closest rank select to this game select
      const container = this.closest('.filter-container');
      if (!container) return;
      
      const rankSelect = container.querySelector('.rank-select');
      if (!rankSelect) return;
      
      // Update rank options based on selected game
      updateRankOptions(rankSelect, this.value);
    });
  });
}

/**
 * Update rank options based on selected game
 * @param {HTMLElement} rankSelect - Rank select element
 * @param {string} game - Selected game
 */
function updateRankOptions(rankSelect, game) {
  // Clear existing options
  rankSelect.innerHTML = '<option value="">All Ranks</option>';
  
  if (!game) return;
  
  // Get ranks for selected game
  const ranks = getAvailableRanks(game);
  
  // Add rank options
  ranks.forEach(rank => {
    const option = document.createElement('option');
    option.value = rank;
    option.textContent = rank;
    rankSelect.appendChild(option);
  });
}

/**
 * Set up event listeners for search forms
 */
function setupSearchEventListeners() {
  // User search form
  const userSearchForm = document.getElementById('user-search-form');
  if (userSearchForm) {
    userSearchForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(userSearchForm);
      const filters = {
        game: formData.get('game'),
        rank: formData.get('rank'),
        language: formData.get('language'),
        interest: formData.get('interest'),
        status: formData.get('status')
      };
      
      // Clean up empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });
      
      try {
        // Perform search
        const users = await searchUsers(filters);
        
        // Update UI with results
        updateUserSearchResults(users);
      } catch (error) {
        console.error('User search error:', error);
        showNotification('Failed to search users. Please try again.', 'error');
      }
    });
  }
  
  // Lobby search form
  const lobbySearchForm = document.getElementById('lobby-search-form');
  if (lobbySearchForm) {
    lobbySearchForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(lobbySearchForm);
      const filters = {
        game: formData.get('game'),
        rank: formData.get('rank'),
        language: formData.get('language'),
        status: formData.get('status')
      };
      
      // Clean up empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
      });
      
      try {
        // Perform search
        const lobbies = await searchLobbies(filters);
        
        // Update UI with results
        updateLobbySearchResults(lobbies);
      } catch (error) {
        console.error('Lobby search error:', error);
        showNotification('Failed to search lobbies. Please try again.', 'error');
      }
    });
  }
}

/**
 * Perform initial searches when page loads
 */
async function performInitialSearches() {
  try {
    // Get users with no filters
    const users = await searchUsers();
    updateUserSearchResults(users);
    
    // Get lobbies with no filters
    const lobbies = await searchLobbies();
    updateLobbySearchResults(lobbies);
  } catch (error) {
    console.error('Initial search error:', error);
    showNotification('Failed to load initial search results.', 'error');
  }
}

/**
 * Update user search results in UI
 * @param {Array} users - Array of user objects
 */
function updateUserSearchResults(users) {
  console.log('User search results:', users);
  
  // Get results container
  const resultsContainer = document.getElementById('user-search-results');
  if (!resultsContainer) return;
  
  // Clear existing results
  resultsContainer.innerHTML = '';
  
  if (users.length === 0) {
    resultsContainer.innerHTML = '<p class="no-results">No users found matching your criteria.</p>';
    return;
  }
  
  // Create result cards for each user
  users.forEach(user => {
    const card = document.createElement('div');
    card.classList.add('user-card');
    
    // Determine online status class
    let statusClass = 'status-offline';
    if (user.onlineStatus === 'online') statusClass = 'status-online';
    else if (user.onlineStatus === 'away') statusClass = 'status-away';
    else if (user.onlineStatus === 'busy') statusClass = 'status-busy';
    
    // Create card content
    card.innerHTML = `
      <div class="user-header">
        <img src="${user.profilePic || '/assets/default-avatar.png'}" alt="${user.username}" class="user-avatar">
        <div class="user-info">
          <h3 class="user-name">${user.displayName || user.username}</h3>
          <p class="user-username">@${user.username}</p>
          <span class="user-status ${statusClass}">${user.onlineStatus}</span>
        </div>
      </div>
      <div class="user-details">
        ${user.gameRanks && user.gameRanks.length > 0 ? 
          `<div class="user-ranks">
            <h4>Game Ranks:</h4>
            <ul>${user.gameRanks.map(rank => `<li>${rank.game}: ${rank.rank}</li>`).join('')}</ul>
          </div>` : ''
        }
        ${user.languages && user.languages.length > 0 ? 
          `<div class="user-languages">
            <h4>Languages:</h4>
            <p>${user.languages.join(', ')}</p>
          </div>` : ''
        }
        ${user.interests && user.interests.length > 0 ? 
          `<div class="user-interests">
            <h4>Interests:</h4>
            <p>${user.interests.join(', ')}</p>
          </div>` : ''
        }
      </div>
      <div class="user-actions">
        <a href="profile.html?id=${user._id}" class="btn btn-primary">View Profile</a>
        ${Auth.isLoggedIn() ? `<button class="btn btn-secondary send-message-btn" data-user-id="${user._id}">Message</button>` : ''}
      </div>
    `;
    
    // Add event listeners for action buttons
    const messageBtn = card.querySelector('.send-message-btn');
    if (messageBtn) {
      messageBtn.addEventListener('click', function() {
        // Open chat with this user
        openChatWithUser(user._id);
      });
    }
    
    // Add card to results container
    resultsContainer.appendChild(card);
  });
}

/**
 * Update lobby search results in UI
 * @param {Array} lobbies - Array of lobby objects
 */
function updateLobbySearchResults(lobbies) {
  console.log('Lobby search results:', lobbies);
  
  // Get results container
  const resultsContainer = document.getElementById('lobby-search-results');
  if (!resultsContainer) return;
  
  // Clear existing results
  resultsContainer.innerHTML = '';
  
  if (lobbies.length === 0) {
    resultsContainer.innerHTML = '<p class="no-results">No lobbies found matching your criteria.</p>';
    return;
  }
  
  // Create result cards for each lobby
  lobbies.forEach(lobby => {
    const card = document.createElement('div');
    card.classList.add('lobby-card');
    
    // Determine status class
    let statusClass = 'status-closed';
    if (lobby.status === 'open') statusClass = 'status-open';
    else if (lobby.status === 'full') statusClass = 'status-full';
    
    // Create card content
    card.innerHTML = `
      <div class="lobby-header">
        <h3 class="lobby-name">${lobby.name}</h3>
        <span class="lobby-status ${statusClass}">${lobby.status}</span>
      </div>
      <div class="lobby-details">
        <p class="lobby-game"><strong>Game:</strong> ${lobby.game}</p>
        <p class="lobby-rank"><strong>Rank:</strong> ${lobby.rank}</p>
        <p class="lobby-language"><strong>Language:</strong> ${lobby.language}</p>
        <p class="lobby-members"><strong>Members:</strong> ${lobby.members.length}/${lobby.maxSize}</p>
        ${lobby.description ? `<p class="lobby-description">${lobby.description}</p>` : ''}
      </div>
      <div class="lobby-creator">
        <p><strong>Created by:</strong> ${lobby.creator.displayName || lobby.creator.username}</p>
      </div>
      <div class="lobby-actions">
        <a href="lobby.html?id=${lobby._id}" class="btn btn-primary">View Lobby</a>
        ${Auth.isLoggedIn() && lobby.status === 'open' ? `<button class="btn btn-secondary join-lobby-btn" data-lobby-id="${lobby._id}">Join Lobby</button>` : ''}
      </div>
    `;
    
    // Add event listeners for action buttons
    const joinBtn = card.querySelector('.join-lobby-btn');
    if (joinBtn) {
      joinBtn.addEventListener('click', async function() {
        try {
          // Join lobby
          await Lobby.joinLobby(lobby._id);
          
          // Show success notification
          showNotification('Successfully joined lobby!', 'success');
          
          // Redirect to lobby details page
          window.location.href = `lobby.html?id=${lobby._id}`;
        } catch (error) {
          console.error('Join lobby error:', error);
          showNotification('Failed to join lobby: ' + error.message, 'error');
        }
      });
    }
    
    // Add card to results container
    resultsContainer.appendChild(card);
  });
}

/**
 * Open chat with user
 * @param {string} userId - User ID
 */
function openChatWithUser(userId) {
  // This function would open a chat modal or redirect to a chat page
  console.log('Opening chat with user:', userId);
  
  // Implementation depends on UI structure
  // Could redirect to a chat page:
  // window.location.href = `chat.html?userId=${userId}`;
  
  // Or open a modal:
  // openChatModal(userId);
  
  // For now, just show a notification
  showNotification('Chat functionality would open here', 'info');
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  console.log(`Notification (${type}):`, message);
  
  // Implementation depends on UI structure
  // This could be a toast notification or alert
}

// Export functions
window.Search = {
  searchUsers,
  searchLobbies,
  getAvailableGames,
  getAvailableRanks,
  getAvailableLanguages,
  getAvailableInterests
};
