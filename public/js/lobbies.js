// Lobbies namespace
window.Lobby = {
    // Game name mappings to handle variations
    gameNameMappings: {
        'cs2': ['csgo', 'cs:go', 'counter-strike', 'counter strike','Counter-Strike 2'],
        'csgo': ['cs2', 'cs:go', 'counter-strike', 'counter strike'],
        'cs:go': ['cs2', 'csgo', 'counter-strike', 'counter strike'],
        'counter-strike': ['cs2', 'csgo', 'cs:go', 'counter strike'],
        'valorant': ['valorant'],
        'lol': ['league of legends', 'league'],
        'league of legends': ['lol', 'league'],
        'apex': ['apex legends'],
        'apex legends': ['apex'],
        'dota 2': ['dota2', 'dota'],
        'dota2': ['dota 2', 'dota']
    },
    
    // Normalize game name to handle variations
    normalizeGameName(gameName) {
        if (!gameName) return '';
        
        const lowerGameName = gameName.toLowerCase();
        
        // Direct match check
        for (const [key, aliases] of Object.entries(this.gameNameMappings)) {
            if (key.toLowerCase() === lowerGameName || aliases.includes(lowerGameName)) {
                // For direct matches, return the filter dropdown format (capitalize first letter of each word)
                return key.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }
        }
        
        // No match found, return original with first letter capitalized
        return gameName.charAt(0).toUpperCase() + gameName.slice(1);
    },
    
    // Function to load lobbies with filters
    async loadLobbies(filters = {}) {
        try {
            // Show loading state
            const container = document.querySelector('.lobbies-grid');
            container.innerHTML = '<div class="loading">Loading lobbies...</div>';

            // Normalize game name if present
            if (filters.game) {
                const originalGameName = filters.game;
                filters.game = this.normalizeGameName(filters.game);
                console.log(`Normalized game filter: "${originalGameName}" → "${filters.game}"`);
            }

            // Construct query parameters
            const queryParams = new URLSearchParams();
            
            // Only add params that are not empty or default values
            if (filters.game && filters.game !== 'All Games' && filters.game !== '') {
                // Use the original casing from the create-lobby form for more accurate matching
                // This helps with case-sensitive databases
                let gameValue = filters.game;
                
                // Convert well-known game names to the format used in the database
                const gameNameLower = gameValue.toLowerCase();
                
                // Special handling for Counter-Strike variations
                if (gameNameLower === 'cs:go' || gameNameLower === 'counter-strike' || 
                    gameNameLower === 'cs2' || gameNameLower === 'counter-strike 2') {
                    gameValue = 'csgo';
                    console.log('Converted CS game name variation to database format:', gameValue);
                } 
                else if (gameNameLower === 'league of legends') {
                    gameValue = 'lol';
                } 
                else if (gameNameLower === 'apex legends') {
                    gameValue = 'apex';
                }
                
                queryParams.append('game', gameValue);
                console.log('Added game param:', gameValue);
            }
            
            if (filters.rank && filters.rank !== 'Any Rank') queryParams.append('rank', filters.rank);
            if (filters.language && filters.language !== 'Any Language') queryParams.append('language', filters.language);
            if (filters.status && filters.status !== 'Any Status') queryParams.append('status', filters.status);

            // Log the request we're about to make
            console.log(`Fetching lobbies from: ${APP_CONFIG.API_URL}/lobbies?${queryParams}`);
            
            // Make API request
            const response = await fetch(`${APP_CONFIG.API_URL}/lobbies?${queryParams}`);
            console.log('Response status:', response.status);
            
            const result = await response.json();
            console.log('API response:', result);

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load lobbies');
            }

            // Log how many lobbies were returned
            console.log(`Loaded ${result.data.length} lobbies`);
            
            // Display lobbies using the data property from the response
            this.displayLobbies(result.data);
        } catch (error) {
            console.error('Error loading lobbies:', error);
            const container = document.querySelector('.lobbies-grid');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load lobbies. Please try again later.</p>
                    <button onclick="window.Lobby.loadLobbies()" class="retry-btn">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    },

    // Function to display lobbies
    displayLobbies(data) {
        const container = document.querySelector('.lobbies-grid');
        container.innerHTML = ''; // Clear existing lobbies

        if (!data || !data.length) {
            container.innerHTML = `
                <div class="no-lobbies">
                    <i class="fas fa-users-slash"></i>
                    <h3>No Lobbies Found</h3>
                    <p>Be the first to create a lobby!</p>
                    <a href="create-lobby.html" class="create-lobby-btn">
                        <i class="fas fa-plus"></i> Create Lobby
                    </a>
                </div>
            `;
            return;
        }

        data.forEach(lobby => {
            const lobbyCard = document.createElement('div');
            lobbyCard.className = 'lobby-card';
            lobbyCard.innerHTML = `
                <div class="lobby-header">
                    <div class="lobby-game">
                        <span>${this.escapeHtml(lobby.gameType)}</span>
                    </div>
                    <span class="lobby-status status-${lobby.status}">${lobby.status}</span>
                </div>
                <div class="lobby-body">
                    <h3 class="lobby-name">${this.escapeHtml(lobby.name)}</h3>
                    <div class="lobby-info">
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <span>Host: ${this.escapeHtml(lobby.host.username)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>Players: ${lobby.currentPlayers}/${lobby.maxPlayers}</span>
                        </div>
                    </div>
                    <div class="lobby-actions">
                        <button class="lobby-btn join-btn" data-lobby-id="${lobby._id}">
                            <i class="fas fa-sign-in-alt"></i> Join
                        </button>
                        <a href="lobby.html?id=${lobby._id}" class="lobby-btn details-btn">
                            <i class="fas fa-info-circle"></i> Details
                        </a>
                    </div>
                </div>
            `;

            container.appendChild(lobbyCard);
        });

        // Add event listeners to join buttons
        this.setupJoinButtons();
    },

    // Function to setup join button handlers
    setupJoinButtons() {
        const joinButtons = document.querySelectorAll('.join-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const lobbyId = e.target.closest('.join-btn').dataset.lobbyId;
                await this.joinLobby(lobbyId);
            });
        });
    },

    // Function to join a lobby
    async joinLobby(lobbyId) {
        try {
            // Use the Auth module if available
            let token;
            if (typeof window.Auth !== 'undefined' && typeof window.Auth.getCurrentUser === 'function') {
                // Auth module exists, use it
                if (!window.Auth.isLoggedIn()) {
                    console.log('User not logged in according to Auth module');
                    window.location.href = 'login.html';
                    return;
                }
                
                token = localStorage.getItem('token');
            } else {
                // Fallback to directly checking localStorage
                token = localStorage.getItem('token');
            }
            
            if (!token) {
                console.log('No token found in localStorage');
                window.location.href = 'login.html';
                return;
            }

            console.log('Joining lobby with ID:', lobbyId);
            const response = await fetch(`${APP_CONFIG.API_URL}/lobbies/${lobbyId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to join lobby');
            }

            // Redirect to the lobby page
            window.location.href = `lobby.html?id=${lobbyId}`;
        } catch (error) {
            console.error('Error joining lobby:', error);
            this.showNotification(error.message, 'error');
        }
    },

    // Function to show notifications
    showNotification(message, type = 'error') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.notifications-container');
        container.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },

    // Helper function to escape HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check for URL parameters to apply filters
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters = {};
    
    // Get game parameter from URL, if present
    const gameParam = urlParams.get('game');
    if (gameParam) {
        // Store the original parameter value
        const originalGameParam = gameParam;
        
        // Normalize the game name using our new helper function
        const normalizedGameName = window.Lobby.normalizeGameName(gameParam);
        initialFilters.game = normalizedGameName;
        
        console.log('Found game parameter in URL:', originalGameParam);
        console.log('Normalized to:', normalizedGameName);
        
        // If we have a filter form, update the game filter dropdown to match
        const gameFilter = document.getElementById('game-filter');
        if (gameFilter) {
            // Find the option that matches our normalized game name (case insensitive)
            const gameOptions = Array.from(gameFilter.options);
            const matchedOption = gameOptions.find(option => 
                option.value.toLowerCase() === normalizedGameName.toLowerCase()
            );
            
            if (matchedOption) {
                gameFilter.value = matchedOption.value;
                console.log('Set game filter dropdown to:', matchedOption.value);
            } else {
                console.log('No exact match found in dropdown for:', normalizedGameName);
                
                // If no perfect match is found, try all options by value and text
                const fuzzyMatch = gameOptions.find(option => {
                    const optionValue = option.value.toLowerCase();
                    const optionText = option.textContent.toLowerCase();
                    const normalized = normalizedGameName.toLowerCase();
                    
                    return optionValue.includes(normalized) || 
                           normalized.includes(optionValue) ||
                           optionText.includes(normalized) ||
                           normalized.includes(optionText);
                });
                
                if (fuzzyMatch) {
                    gameFilter.value = fuzzyMatch.value;
                    console.log('Set game filter to fuzzy match:', fuzzyMatch.value);
                } else {
                    console.log('No match found in dropdown, filter may not apply correctly');
                }
            }
        }
    }
    
    // Get additional filters from URL (rank, language, status) if present
    ['rank', 'language', 'status'].forEach(param => {
        const value = urlParams.get(param);
        if (value) {
            initialFilters[param] = value;
            
            // Update the corresponding form element if it exists
            const filterElement = document.getElementById(`${param}-filter`);
            if (filterElement) {
                filterElement.value = value;
            }
        }
    });
    
    // Log the initial filters 
    console.log('Loading lobbies with initial filters:', initialFilters);
    
    // Load lobbies with URL parameters as filters
    window.Lobby.loadLobbies(initialFilters);

    // Setup filter form
    const filterForm = document.getElementById('filters-form');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const filters = {
                game: document.getElementById('game-filter').value,
                rank: document.getElementById('rank-filter').value,
                language: document.getElementById('language-filter').value,
                status: document.getElementById('status-filter').value
            };
            window.Lobby.loadLobbies(filters);
        });

        // Setup reset button
        const resetButton = filterForm.querySelector('.reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                filterForm.reset();
                window.Lobby.loadLobbies();
            });
        }
    }

    // Setup toggle filters button
    const toggleFiltersBtn = document.getElementById('toggle-filters');
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', () => {
            filterForm.classList.toggle('hidden');
        });
    }
});
