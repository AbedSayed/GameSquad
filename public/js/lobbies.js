// Lobbies module for managing game lobbies
class LobbiesModule {
    constructor() {
        // Initialize any needed properties
        this.lobbiesData = null;
        this.currentFilters = {};
        
        console.log('LobbiesModule initialized');
        
        // Bind methods to this instance
        this.loadLobbies = this.loadLobbies.bind(this);
        this.displayLobbies = this.displayLobbies.bind(this);
        this.createLobbyCard = this.createLobbyCard.bind(this);
        this.filterLobbies = this.filterLobbies.bind(this);
        this.loadLocalLobbies = this.loadLocalLobbies.bind(this);
        this.normalizeGameName = this.normalizeGameName.bind(this);
        this.calculatePlayerCount = this.calculatePlayerCount.bind(this);
    }
    
    // Normalize game names for consistency
    normalizeGameName(gameName) {
        if (!gameName) return '';
        
        // Map of common variations to standardized names
        const gameNameMap = {
            'cs': 'CS2',
            'cs2': 'CS2',
            'counter-strike': 'CS2',
            'counter strike': 'CS2',
            'counterstrike': 'CS2',
            'counter-strike 2': 'CS2',
            'csgo': 'CS2',
            'lol': 'League of Legends',
            'league': 'League of Legends',
            'valorant': 'VALORANT',
            'val': 'VALORANT',
            'apex': 'Apex Legends',
            'fortnite': 'Fortnite',
            'fn': 'Fortnite',
            'cod': 'Call of Duty',
            'call of duty': 'Call of Duty',
            'warzone': 'Call of Duty: Warzone',
            'wz': 'Call of Duty: Warzone',
            'overwatch': 'Overwatch 2',
            'ow': 'Overwatch 2',
            'overwatch2': 'Overwatch 2',
            'ow2': 'Overwatch 2',
            'dota': 'Dota 2',
            'dota2': 'Dota 2',
            'rl': 'Rocket League',
            'rocket league': 'Rocket League',
            'pubg': 'PUBG: BATTLEGROUNDS',
            'roblox': 'Roblox',
            'minecraft': 'Minecraft',
            'mc': 'Minecraft'
        };
        
        // Try to match the input to a standardized name
        const normalizedName = gameNameMap[gameName.toLowerCase()];
        
        // Return the standardized name if found, otherwise return the original with first letter capitalized
        return normalizedName || (gameName.charAt(0).toUpperCase() + gameName.slice(1));
    }
    
    // Function to load lobbies from localStorage only (demo mode)
    async loadLobbies(filters = {}) {
        console.log('Loading lobbies with filters:', filters);
        
        // Show loading state in containers
        const myLobbiesContainer = document.getElementById('myLobbies');
        const otherLobbiesContainer = document.getElementById('otherLobbies');
        
        if (myLobbiesContainer) {
            myLobbiesContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading your lobbies...</p>
                </div>
            `;
        }
        
        if (otherLobbiesContainer) {
            otherLobbiesContainer.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading available lobbies...</p>
                </div>
            `;
        }
        
        // Normalize and clean up filters
        Object.keys(filters).forEach(key => {
            // Convert empty strings to null/undefined
            if (filters[key] === '') {
                delete filters[key];
            }
        });
        
        // Special handling for game arrays
        if (filters.game && Array.isArray(filters.game)) {
            console.log('Found game array in filters:', filters.game);
            // We'll handle this specially in the filtering logic, so we don't need to modify it here
        }
        // Convert normalized game names back to API expected values
        else if (filters.game && typeof filters.game === 'string') {
            // Map standardized names to API expected values
            const apiGameMap = {
                'Apex Legends': 'apex',
                'League of Legends': 'lol',
                'VALORANT': 'valorant',
                'CS2': 'csgo',
                'Fortnite': 'fortnite',
                'Call of Duty': 'cod',
                'Call of Duty: Warzone': 'warzone',
                'Overwatch 2': 'overwatch',
                'Dota 2': 'dota2',
                'Rocket League': 'rocketleague',
                'PUBG: BATTLEGROUNDS': 'pubg'
            };
            
            // If we have a mapping, use it; otherwise, use lowercase of the game name
            filters.game = apiGameMap[filters.game] || filters.game.toLowerCase();
        }
        
        console.log('Normalized filters for API call:', filters);
        
        try {
            // Get the latest auth token
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            
            // Determine the API URL - with fallback if config isn't available
            const baseApiUrl = window.APP_CONFIG && window.APP_CONFIG.API_URL 
                ? window.APP_CONFIG.API_URL
                : '/api';
                
            const apiUrl = `${window.location.origin}${baseApiUrl}/lobbies`;
                
            console.log('Using API URL:', apiUrl);
            
            // Build query string from filters
            const queryParams = [];
            for (const [key, value] of Object.entries(filters)) {
                if (value && value !== 'all' && value !== '') {
                    queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
            
            const url = queryParams.length > 0 
                ? `${apiUrl}?${queryParams.join('&')}` 
                : apiUrl;
                
            console.log('Fetching lobbies from:', url);
            
            // Request options
            const options = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            
            // Add auth token if available
            if (token) {
                // Make sure we have a proper Bearer token format
                const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                console.log('Using auth token:', tokenValue);
                options.headers['Authorization'] = tokenValue;
            }
            
            // Make API request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
            
            options.signal = controller.signal;
            
            let response;
            try {
                console.log('Sending API request with options:', options);
                response = await fetch(url, options);
                clearTimeout(timeoutId);
                console.log('API response status:', response.status);
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    console.warn('Request timed out, using localStorage fallback');
                    return this.loadLocalLobbies(filters);
                }
                
                console.error('Network error:', error);
                throw error;
            }
            
            // Handle API response status
            if (!response.ok) {
                // If unauthorized, try using localStorage instead
                if (response.status === 401) {
                    console.warn('Unauthorized API access, using localStorage fallback');
                    return this.loadLocalLobbies(filters);
                }
                
                // For other error codes
                const errorText = await response.text();
                console.error(`API error (${response.status}):`, errorText);
                throw new Error(`Failed to load lobbies: ${response.statusText}`);
            }
            
            // Parse JSON response
            const responseText = await response.text();
            console.log('API response text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error('Invalid JSON response from API');
            }
            
            console.log('Lobbies loaded from API:', data);
            
            // Check if data is in expected format (direct array or wrapped in data property)
            let lobbies = Array.isArray(data) ? data : null;
            
            // Check common API response formats
            if (!lobbies && data) {
                if (Array.isArray(data.data)) {
                    lobbies = data.data;
                } else if (Array.isArray(data.lobbies)) {
                    lobbies = data.lobbies;
                } else if (Array.isArray(data.results)) {
                    lobbies = data.results;
                } else if (data.success && Array.isArray(data.result)) {
                    lobbies = data.result;
                }
            }
            
            // If still no lobbies array found, fallback to localStorage
            if (!lobbies) {
                console.warn('Unexpected API response format, using localStorage fallback');
                return this.loadLocalLobbies(filters);
            }
            
            // Update local cache with the latest lobbies
            if (lobbies.length > 0) {
                localStorage.setItem('lobbies', JSON.stringify(lobbies));
            }
            
            // Display the lobbies
            this.displayLobbies(lobbies);
            return lobbies;
        } catch (error) {
            console.error('Error loading lobbies:', error);
            
            // Show error notification
            try {
                const notification = document.createElement('div');
                notification.className = 'notification error';
                notification.innerHTML = `
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Error loading lobbies: ${error.message}</span>
                `;
                
                const container = document.querySelector('.notifications-container');
                if (container) container.appendChild(notification);
                
                // Remove notification after 5 seconds
                setTimeout(() => {
                    notification.classList.add('fade-out');
                    setTimeout(() => notification.remove(), 300);
                }, 5000);
            } catch (e) {
                console.error('Error displaying notification:', e);
            }
            
            // Fall back to localStorage in any case
            return this.loadLocalLobbies(filters);
        }
    }
    
    // Display the lobbies on the page
    displayLobbies(lobbies) {
        const myLobbiesContainer = document.getElementById('myLobbies');
        const otherLobbiesContainer = document.getElementById('otherLobbies');
        
        // First, clear out the containers
        if (myLobbiesContainer) {
            myLobbiesContainer.innerHTML = '';
        }
        
        if (otherLobbiesContainer) {
            otherLobbiesContainer.innerHTML = '';
        }
        
        // Get the current user ID
        const userId = this.getUserId();
        
        console.log('Displaying lobbies with userID:', userId);
        console.log('Total lobbies:', lobbies.length);
        
        // Debug: log game types of lobbies
        console.log('Game types of lobbies:');
        lobbies.forEach(lobby => {
            console.log(`Lobby "${lobby.name}" - gameType: ${lobby.gameType}, game: ${lobby.game}`);
        });
        
        // Check if we have a game filter in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const gameFilter = urlParams.get('game');
        if (gameFilter) {
            console.log(`Game filter from URL: ${gameFilter}`);
            const matchingLobbies = lobbies.filter(lobby => 
                lobby.gameType?.toLowerCase() === gameFilter.toLowerCase()
            );
            console.log(`Lobbies matching filter: ${matchingLobbies.length}`);
            
            // Show notification if no lobbies match the filter
            if (lobbies.length === 0) {
                this.showNotification(`No ${this.normalizeGameName(gameFilter)} lobbies found. Be the first to create one!`, 'info');
                
                // Add a create lobby button for this game
                if (otherLobbiesContainer) {
                    otherLobbiesContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No lobbies found for ${this.normalizeGameName(gameFilter)}</h3>
                            <p>Be the first to create a lobby for this game!</p>
                            <a href="create-lobby.html?game=${gameFilter}" class="btn btn-primary">
                                <i class="fas fa-plus-circle"></i> Create ${this.normalizeGameName(gameFilter)} Lobby
                            </a>
                        </div>
                    `;
                }
            }
        }
        
        // Separate my lobbies and other lobbies
        const myLobbies = [];
        const otherLobbies = [];
        
        lobbies.forEach(lobby => {
            // Check if this lobby belongs to the current user (as host)
            const isHost = lobby.host === userId || 
                           (typeof lobby.host === 'object' && lobby.host?._id === userId) ||
                           lobby.host === 'current_user' ||
                           (lobby.hostInfo && (lobby.hostInfo._id === userId || lobby.hostInfo._id === 'current_user'));
            
            // Check if current user is a player in this lobby
            const isPlayer = Array.isArray(lobby.players) && lobby.players.some(player => {
                if (typeof player === 'string') {
                    return player === userId;
                } else if (player.user) {
                    return (typeof player.user === 'string' && player.user === userId) ||
                           (typeof player.user === 'object' && player.user._id === userId);
                }
                return false;
            });
            
            // Consider the lobby as "owned" if the user is either the host or a player
            const isOwned = isHost || isPlayer;
            
            console.log(`Lobby ${lobby.name} - host: ${JSON.stringify(lobby.host)}, isHost: ${isHost}, isPlayer: ${isPlayer}, isOwned: ${isOwned}`);
            
            if (isOwned) {
                myLobbies.push(lobby);
            } else {
                otherLobbies.push(lobby);
            }
        });
        
        console.log('My lobbies:', myLobbies.length);
        console.log('Other lobbies:', otherLobbies.length);
        
        // Display my lobbies
        if (myLobbiesContainer) {
            if (myLobbies.length > 0) {
                myLobbies.forEach(lobby => {
                    const lobbyCard = this.createLobbyCard(lobby, true);
                    myLobbiesContainer.appendChild(lobbyCard);
                });
            } else {
                myLobbiesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-gamepad"></i>
                        <p>You haven't created or joined any lobbies yet</p>
                        <a href="create-lobby.html" class="btn btn-primary btn-hover-fx">
                            <i class="fas fa-plus"></i> Create a Lobby
                        </a>
                    </div>
                `;
            }
        }
        
        // Display other lobbies
        if (otherLobbiesContainer) {
            if (otherLobbies.length > 0) {
                otherLobbies.forEach(lobby => {
                    const lobbyCard = this.createLobbyCard(lobby, false);
                    otherLobbiesContainer.appendChild(lobbyCard);
                });
            } else {
                otherLobbiesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No lobbies available right now</p>
                        <p class="subtext">Try adjusting your filters or create your own lobby!</p>
                    </div>
                `;
            }
        }
    }
    
    // Create a lobby card
    createLobbyCard(lobby, isOwned) {
        // Create the card container
        const card = document.createElement('div');
        card.className = 'game-card';
        card.setAttribute('data-lobby-id', lobby._id);
        
        // Debug - log entire lobby object to see what's available
        console.log(`Creating lobby card for: ${lobby.name}`, lobby);
        
        // Log the description specifically
        console.log(`Lobby description for ${lobby.name}:`, {
            description: lobby.description,
            hasDescription: !!lobby.description,
            descriptionLength: lobby.description ? lobby.description.length : 0
        });
        
        // Format the creation date
        let createdDate = 'Recently';
        if (lobby.createdAt) {
            try {
                const date = new Date(lobby.createdAt);
                createdDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                });
            } catch (e) {
                console.warn('Error formatting date:', e);
            }
        }
        
        // Set default image path for the game
        let gameLogo = '../resources/default-game.png';
        
        // Map game types to their respective image paths
        const gameImages = {
            'valorant': '../resources/Valorant-Logo-PNG-Image.png',
            'csgo': '../resources/counter-strike-png-.png',
            'lol': '../resources/leageofLegend.png.png',
            'apex': '../resources/apex.png.png',
            'fortnite': '../assets/images/games/Fortnite.jpg',
            'dota2': '../assets/images/games/dota2.jpg',
            'overwatch': '../assets/images/games/OW.png',
            'rocketleague': '../assets/images/games/RL.png',
            'default': '../resources/default-game.png'
        };
        
        console.log(`Lobby ${lobby.name} - debug values:
           game: ${lobby.game}
           gameType: ${lobby.gameType}
           gameName: ${lobby.gameName}
        `);
        
        // Try all available methods to find the game image
        let game = null;
        
        // Special case for League of Legends
        if ((lobby.game && lobby.game.toLowerCase() === 'lol') || 
            (lobby.gameType && lobby.gameType.toLowerCase() === 'lol') ||
            (lobby.gameName && lobby.gameName.toLowerCase().includes('league of legends'))) {
            game = 'lol';
            console.log(`Found League of Legends lobby: ${lobby.name}`);
        }
        // 1. First check gameType as it's most reliable
        else if (lobby.gameType && typeof lobby.gameType === 'string') {
            game = lobby.gameType.toLowerCase();
        }
        // 2. Check direct game property
        else if (lobby.game && typeof lobby.game === 'string') {
            // Only use game if it's a known game identifier and not a category like "FPS"
            if (['valorant', 'csgo', 'lol', 'apex', 'fortnite', 'dota2', 'overwatch', 'rocketleague'].includes(lobby.game.toLowerCase())) {
                game = lobby.game.toLowerCase();
            }
        }
        // 3. Check gameName property
        else if (lobby.gameName && typeof lobby.gameName === 'string') {
            // Map common names to game identifiers
            const gameNameMap = {
                'valorant': 'valorant',
                'counter-strike 2': 'csgo',
                'cs2': 'csgo',
                'league of legends': 'lol',
                'apex legends': 'apex',
                'fortnite': 'fortnite',
                'dota 2': 'dota2',
                'overwatch 2': 'overwatch',
                'rocket league': 'rocketleague'
            };
            game = gameNameMap[lobby.gameName.toLowerCase()];
        }
        
        // Now use the determined game to find the image
        if (game && gameImages[game]) {
            gameLogo = gameImages[game];
            console.log(`Using image for ${game}: ${gameLogo}`);
        }
        // Fallback to gameImage if defined
        else if (lobby.gameImage) {
            gameLogo = lobby.gameImage;
            console.log(`Using direct gameImage: ${gameLogo}`);
        }
        
        console.log(`Lobby ${lobby.name}: gameType = ${lobby.gameType}, using logo: ${gameLogo}`);
        
        // Get the host name
        let hostName = 'Unknown Host';
        
        // Handle different host representation formats from API
        if (lobby.hostInfo && lobby.hostInfo.username) {
            // Format from localStorage/demo data
            hostName = lobby.hostInfo.username;
        } else if (lobby.host) {
            if (typeof lobby.host === 'string') {
                // Just an ID string, can't display a name
                hostName = 'Host ID: ' + lobby.host.substring(0, 6) + '...';
            } else if (lobby.host.username) {
                // Populated host object from API
                hostName = lobby.host.username;
            } else if (lobby.host._id) {
                // Object with just ID
                hostName = 'Host ID: ' + lobby.host._id.substring(0, 6) + '...';
            }
        }
        
        // Get status class
        let statusClass = 'status-open';
        if (lobby.status === 'full') {
            statusClass = 'status-full';
        } else if (lobby.status === 'in-progress') {
            statusClass = 'status-in-progress';
        }
        
        // Determine the game display name
        let gameDisplayName = 'Game';
        if (game) {
            // Map game identifiers to display names
            const gameDisplayMap = {
                'valorant': 'Valorant',
                'csgo': 'Counter-Strike 2',
                'lol': 'League of Legends',
                'apex': 'Apex Legends',
                'fortnite': 'Fortnite',
                'dota2': 'Dota 2',
                'overwatch': 'Overwatch 2',
                'rocketleague': 'Rocket League'
            };
            gameDisplayName = gameDisplayMap[game] || game.charAt(0).toUpperCase() + game.slice(1);
        } else if (lobby.gameName) {
            gameDisplayName = lobby.gameName;
        } else if (typeof lobby.game === 'string' && !['fps', 'moba', 'battle royale', 'rpg', 'sports'].includes(lobby.game.toLowerCase())) {
            gameDisplayName = lobby.game;
        }
        
        // Get formatted rank display
        let rankDisplay = 'Any Rank';
        if (lobby.rank) {
            // Special case for CS2 ranks with underscores
            if (game === 'csgo' && lobby.rank.includes('_')) {
                // Convert underscore format to display format
                // Example: master_guardian_elite -> Master Guardian Elite
                rankDisplay = lobby.rank
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                
                // Store the normalized rank for filtering
                lobby.normalizedRank = lobby.rank.replace(/[_\s]/g, '').toLowerCase();
            } else {
                // Get the game ranks to display the proper rank label
                const gameRanks = this.getGameRanks(game);
                
                if (gameRanks) {
                    // Find the matching rank to get its label
                    const rankEntry = gameRanks.find(r => 
                        r.value === lobby.rank.toLowerCase() || 
                        r.value === lobby.rank.replace(/[_\s]/g, '').toLowerCase()
                    );
                    if (rankEntry) {
                        rankDisplay = rankEntry.label;
                        // Store normalized rank for filtering
                        lobby.normalizedRank = rankEntry.value;
                    } else {
                        // If no exact match found, try to format the rank string
                        rankDisplay = lobby.rank.charAt(0).toUpperCase() + lobby.rank.slice(1).replace(/([A-Z])/g, ' $1').trim();
                        // Store normalized rank for filtering
                        lobby.normalizedRank = lobby.rank.replace(/[_\s]/g, '').toLowerCase();
                    }
                }
            }
        }
        
        // Create the HTML content for the card
        card.innerHTML = `
            <div class="game-card-header">
                <div class="game-logo">
                    <img src="${gameLogo}" alt="${gameDisplayName}" onerror="this.src='../resources/default-game.png'">
                </div>
                <div class="game-type">
                    <span class="badge badge-${game || 'default'}">${gameDisplayName}</span>
                </div>
                <div class="game-status">
                    <span class="badge ${statusClass}">${lobby.status || 'Open'}</span>
                </div>
            </div>
            <div class="game-card-body">
                <h3 class="game-title">${lobby.name || 'Unnamed Lobby'}</h3>
                <p class="game-description">${lobby.description || 'No description provided.'}</p>
                <div class="game-details">
                    <div class="detail">
                        <i class="fas fa-user-friends"></i>
                        <span>${this.calculatePlayerCount(lobby)}/${lobby.maxPlayers || 4}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${createdDate}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-user"></i>
                        <span>${hostName}</span>
                    </div>
                </div>
                <div class="rank-level">
                    <span>Rank:</span>
                    <span class="rank-badge rank-${lobby.rank || 'any'}">${rankDisplay}</span>
                </div>
            </div>
            <div class="game-card-footer">
                ${isOwned ? 
                    `<button class="btn btn-primary view-lobby">
                        <i class="fas fa-edit"></i> Manage
                    </button>` : 
                    `<button class="btn btn-primary join-lobby">
                        <i class="fas fa-sign-in-alt"></i> Join
                    </button>`
                }
            </div>
        `;
        
        // Add click event to the card for lobby detail view
        card.addEventListener('click', (event) => {
            // Don't trigger if they clicked specifically on a button in the footer
            if (!event.target.closest('.game-card-footer')) {
                window.location.href = `lobby.html?id=${lobby._id}`;
            }
        });
        
        // Add button click events
        const viewButton = card.querySelector('.view-lobby');
        const joinButton = card.querySelector('.join-lobby');
        
        if (viewButton) {
            viewButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent card click
                window.location.href = `lobby.html?id=${lobby._id}&manage=true`;
            });
        }
        
        if (joinButton) {
            joinButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent card click
                
                // Check if the lobby is full
                if (lobby.status === 'full') {
                    this.showNotification('This lobby is already full', 'error');
                    return;
                }
                
                // Check if the game is in progress
                if (lobby.status === 'in-progress') {
                    this.showNotification('This game is already in progress', 'warning');
                    return;
                }
                
                window.location.href = `lobby.html?id=${lobby._id}&join=true`;
            });
        }
        
        return card;
    }
    
    // Helper function to calculate player count from different possible data structures
    calculatePlayerCount(lobby) {
        // First try the currentPlayers property which should be the source of truth
        if (typeof lobby.currentPlayers === 'number') {
            return lobby.currentPlayers;
        }
        
        // Next try the players array length if it exists
        if (Array.isArray(lobby.players)) {
            return lobby.players.length;
        }
        
        // If the lobby has a members array (alternative structure)
        if (Array.isArray(lobby.members)) {
            return lobby.members.length;
        }
        
        // Fallback to 1 (assuming at least the host is in there)
        return lobby.currentPlayers || 1;
    }
    
    // Clear localStorage lobbies and start fresh to fix filtering issues
    clearAndReinitLobbies() {
        console.log('Clearing and reinitializing lobbies in localStorage');
        localStorage.removeItem('lobbies');
        const freshDemoLobbies = this.generateDemoLobbies();
        localStorage.setItem('lobbies', JSON.stringify(freshDemoLobbies));
        return freshDemoLobbies;
    }
    
    // Filter lobbies based on selected filters
    filterLobbies(lobbies, filters) {
        console.log('Filtering lobbies with filters:', filters);
        console.log('Total lobbies before filtering:', lobbies.length);
        
        // Pre-process filters to avoid null/undefined issues
        const cleanFilters = {};
        for (const [key, value] of Object.entries(filters)) {
            if (value && value !== '' && value !== 'all' && value !== 'any') {
                if (key === 'game' && Array.isArray(value)) {
                    // Keep arrays as they are
                    cleanFilters[key] = value;
                } else {
                    cleanFilters[key] = typeof value === 'string' ? value.toLowerCase() : value;
                }
            }
        }
        
        console.log('Using clean filters:', cleanFilters);
        
        // Debug - log all lobbies with their relevant properties
        lobbies.forEach(lobby => {
            console.log(`Lobby "${lobby.name}": game=${lobby.game}, gameType=${lobby.gameType}, region=${lobby.region}, rank=${lobby.rank}`);
        });
        
        // Create demo rank data if needed for testing
        lobbies = this.enrichLobbyRankData(lobbies, cleanFilters.game);
        
        const filteredLobbies = lobbies.filter(lobby => {
            // Game filter
            if (cleanFilters.game) {
                if (Array.isArray(cleanFilters.game)) {
                    // Handle array of games (for category filtering)
                    console.log(`Checking if lobby "${lobby.name}" matches any game in:`, cleanFilters.game);
                    
                    let matchesAnyGame = false;
                    
                    for (const gameOption of cleanFilters.game) {
                        // Check if lobby game matches this option
                        if ((lobby.game && lobby.game.toLowerCase() === gameOption.toLowerCase()) ||
                            (lobby.gameType && lobby.gameType.toLowerCase() === gameOption.toLowerCase()) ||
                            (lobby.gameName && lobby.gameName.toLowerCase().includes(gameOption.toLowerCase()))) {
                            console.log(`Lobby "${lobby.name}" matches game option: ${gameOption}`);
                            matchesAnyGame = true;
                            break;
                        }
                    }
                    
                    if (!matchesAnyGame) {
                        console.log(`Filtering out "${lobby.name}" - doesn't match any game in the category`);
                        return false;
                    }
                } else {
                    // Handle single game filter (string)
                    // Determine if the lobby matches the requested game
                    let matchesGame = false;
                    
                    // Check different possible game fields
                    if (lobby.game && lobby.game.toLowerCase() === cleanFilters.game) {
                        matchesGame = true;
                    } else if (lobby.gameType && lobby.gameType.toLowerCase() === cleanFilters.game) {
                        matchesGame = true;
                    } else if (lobby.gameName && lobby.gameName.toLowerCase().includes(cleanFilters.game)) {
                        matchesGame = true;
                    }
                    
                    // If no match found for the game, filter out this lobby
                    if (!matchesGame) {
                        console.log(`Filtering out "${lobby.name}" - game mismatch`);
                        return false;
                    }
                }
            }
            
            // GameType filter - for category tabs (fps, moba, battle-royale, rpg)
            if (cleanFilters.gameType) {
                const gameTypeMap = {
                    'fps': ['valorant', 'csgo', 'cod', 'overwatch'],
                    'moba': ['lol', 'dota2'],
                    'battle-royale': ['fortnite', 'apex', 'pubg', 'warzone'],
                    'rpg': ['minecraft', 'wow', 'elder scrolls', 'fallout']
                };
                
                // Get the list of games in this category
                const gameList = gameTypeMap[cleanFilters.gameType] || [];
                
                // Check if the lobby's game matches any game in this category
                let matchesGameType = false;
                
                // First, check the gameCategory property (most reliable)
                if (lobby.gameCategory && lobby.gameCategory.toLowerCase() === cleanFilters.gameType.toLowerCase()) {
                    console.log(`Lobby "${lobby.name}" matches gameCategory: ${cleanFilters.gameType}`);
                    matchesGameType = true;
                }
                // Then check direct gameType match
                else if (lobby.gameType && lobby.gameType.toLowerCase() === cleanFilters.gameType.toLowerCase()) {
                    console.log(`Lobby "${lobby.name}" matches direct gameType: ${cleanFilters.gameType}`);
                    matchesGameType = true;
                } 
                // Finally check if game is in the list for this category
                else if (lobby.gameType && gameList.includes(lobby.gameType.toLowerCase())) {
                    console.log(`Lobby "${lobby.name}" gameType ${lobby.gameType} is in category ${cleanFilters.gameType}`);
                    matchesGameType = true;
                }
                
                // If no match for this game type category, filter out
                if (!matchesGameType) {
                    console.log(`Filtering out "${lobby.name}" - gameType mismatch for ${cleanFilters.gameType}`);
                    return false;
                }
            }
            
            // Region filter
            if (cleanFilters.region && lobby.region) {
                const lobbyRegion = lobby.region.toLowerCase();
                if (lobbyRegion !== cleanFilters.region) {
                    console.log(`Filtering out "${lobby.name}" - region mismatch: ${lobbyRegion} vs ${cleanFilters.region}`);
                    return false;
                }
            }
            
            // Rank filter
            if (cleanFilters.rank) {
                // Get the game for this lobby to determine rank structure
                let gameKey = 'default';
                if (cleanFilters.game) {
                    // Use the selected game filter for consistent rank matching
                    gameKey = cleanFilters.game.toLowerCase();
                } else if (lobby.gameType) {
                    gameKey = lobby.gameType.toLowerCase();
                } else if (lobby.game && ['valorant', 'csgo', 'lol', 'apex', 'fortnite', 'dota2', 'overwatch'].includes(lobby.game.toLowerCase())) {
                    gameKey = lobby.game.toLowerCase();
                }
                
                console.log(`Checking rank filter for "${lobby.name}": game=${gameKey}, filterRank=${cleanFilters.rank}, lobbyRank=${lobby.rank}`);
                
                // Use normalized ranks to make comparison easier
                // If we have a normalized rank stored from createLobbyCard, use it
                const normalizedLobbyRank = lobby.normalizedRank ? 
                    lobby.normalizedRank.toLowerCase() : 
                    (lobby.rank || '').replace(/[_\s-]/g, '').toLowerCase();
                
                const normalizedFilterRank = cleanFilters.rank.replace(/[_\s-]/g, '').toLowerCase();
                
                console.log(`Normalized ranks: lobby=${normalizedLobbyRank}, filter=${normalizedFilterRank}`);
                
                // First try simple exact matching (most reliable)
                if (normalizedLobbyRank === normalizedFilterRank) {
                    console.log(`Exact rank match for "${lobby.name}": ${normalizedLobbyRank} = ${normalizedFilterRank}`);
                    return true;
                }
                
                // Next try contains matching (more forgiving)
                if (normalizedLobbyRank.includes(normalizedFilterRank) || 
                    normalizedFilterRank.includes(normalizedLobbyRank)) {
                    console.log(`Partial rank match for "${lobby.name}": ${normalizedLobbyRank} contains/is contained in ${normalizedFilterRank}`);
                    return true;
                }
                
                // Get the game's rank structure to compare by position
                const gameRanks = this.getGameRanks(gameKey);
                if (gameRanks && gameRanks.length > 0) {
                    // Find positions in rank hierarchy
                    const filterRankIndex = gameRanks.findIndex(r => 
                        r.value.toLowerCase() === normalizedFilterRank || 
                        normalizedFilterRank.includes(r.value.toLowerCase()) ||
                        r.label.toLowerCase().replace(/\s+/g, '') === normalizedFilterRank);
                        
                    const lobbyRankIndex = gameRanks.findIndex(r => 
                        r.value.toLowerCase() === normalizedLobbyRank || 
                        normalizedLobbyRank.includes(r.value.toLowerCase()) ||
                        r.label.toLowerCase().replace(/\s+/g, '') === normalizedLobbyRank);
                    
                    // If we found both ranks in the hierarchy, compare them
                    if (filterRankIndex !== -1 && lobbyRankIndex !== -1) {
                        // Exact position match
                        if (filterRankIndex === lobbyRankIndex) {
                            console.log(`Rank hierarchy match for "${lobby.name}": positions match (${filterRankIndex})`);
                            return true;
                        }
                    }
                }
                
                // Special handling for games with rank variations
                
                // CS2-specific handling (if needed)
                if (gameKey === 'csgo') {
                    // Common CS2 rank mappings for abbreviations
                    const csMapping = {
                        'mge': 'masterguardianelite',
                        'masterguardianelite': 'mge',
                        'dmg': 'distinguishedmasterguardian',
                        'distinguishedmasterguardian': 'dmg',
                        'le': 'legendaryeagle',
                        'legendaryeagle': 'le',
                        'lem': 'legendaryeaglemaster',
                        'legendaryeaglemaster': 'lem',
                        'smfc': 'suprememasterfirstclass',
                        'suprememasterfirstclass': 'smfc',
                        'ge': 'globalelite',
                        'globalelite': 'ge'
                    };
                    
                    // Check if we can match using CS2 rank mappings
                    if (csMapping[normalizedLobbyRank] === normalizedFilterRank || 
                        csMapping[normalizedFilterRank] === normalizedLobbyRank) {
                        console.log(`CS2 abbreviation match for "${lobby.name}"`);
                        return true;
                    }
                }
                
                // League of Legends handling
                if (gameKey === 'lol') {
                    // Check for rank tier with divisions (e.g., "gold 4" should match "gold")
                    const lobbyRankBase = normalizedLobbyRank.replace(/[0-9ivx]+$/, '').trim();
                    const filterRankBase = normalizedFilterRank.replace(/[0-9ivx]+$/, '').trim();
                    
                    if (lobbyRankBase === filterRankBase) {
                        console.log(`LoL rank tier match for "${lobby.name}": ${lobbyRankBase}`);
                        return true;
                    }
                }
                
                // No match found after all attempts
                console.log(`Filtering out "${lobby.name}" - no rank match between ${lobby.rank} vs ${cleanFilters.rank}`);
                return false;
            }
            
            // Status filter
            if (cleanFilters.status && lobby.status) {
                const lobbyStatus = lobby.status.toLowerCase();
                if (lobbyStatus !== cleanFilters.status) {
                    console.log(`Filtering out "${lobby.name}" - status mismatch: ${lobbyStatus} vs ${cleanFilters.status}`);
                    return false;
                }
            }
            
            // All filters passed
            return true;
        });
        
        console.log(`Filtering complete: ${filteredLobbies.length} of ${lobbies.length} lobbies matched filters`);
        return filteredLobbies;
    }
    
    // Enrich lobbies with game-specific rank data for better filtering
    enrichLobbyRankData(lobbies, gameFilter) {
        // Only process if we have a game filter
        if (!gameFilter) return lobbies;
        
        console.log(`Enriching lobby rank data for game: ${gameFilter}`);
        
        // Clone lobbies to avoid modifying the original
        const enrichedLobbies = lobbies.map(lobby => {
            const enrichedLobby = {...lobby};
            
            // Skip if lobby already has a rank
            if (enrichedLobby.rank) return enrichedLobby;
            
            // Check if this lobby matches the game filter
            let matchesGame = false;
            if (enrichedLobby.game && enrichedLobby.game.toLowerCase() === gameFilter) {
                matchesGame = true;
            } else if (enrichedLobby.gameType && enrichedLobby.gameType.toLowerCase() === gameFilter) {
                matchesGame = true;
            } else if (enrichedLobby.gameName && enrichedLobby.gameName.toLowerCase().includes(gameFilter)) {
                matchesGame = true;
            }
            
            // Only add rank data if the lobby matches the game filter
            if (matchesGame && enrichedLobby.skillLevel) {
                // Convert numeric skill level to game-specific rank
                const gameRanks = this.getGameRanks(gameFilter);
                if (gameRanks && gameRanks.length > 0) {
                    // Map skill level 1-5 to appropriate rank index
                    const normalizedLevel = Math.max(1, Math.min(5, enrichedLobby.skillLevel));
                    const rankIndex = Math.floor((normalizedLevel - 1) / 5 * (gameRanks.length - 1));
                    
                    if (gameRanks[rankIndex]) {
                        enrichedLobby.rank = gameRanks[rankIndex].value;
                        console.log(`Enriched lobby "${enrichedLobby.name}" with rank: ${enrichedLobby.rank} (from skillLevel: ${enrichedLobby.skillLevel})`);
                    }
                }
            }
            
            return enrichedLobby;
        });
        
        return enrichedLobbies;
    }
    
    // Helper function to get ranks for a specific game
    getGameRanks(game) {
        if (!game) return null;
        
        // Define rank options for different games
        const gameRanks = {
            'valorant': [
                { value: 'iron', label: 'Iron' },
                { value: 'bronze', label: 'Bronze' },
                { value: 'silver', label: 'Silver' },
                { value: 'gold', label: 'Gold' },
                { value: 'platinum', label: 'Platinum' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'ascendant', label: 'Ascendant' },
                { value: 'immortal', label: 'Immortal' },
                { value: 'radiant', label: 'Radiant' }
            ],
            'csgo': [
                { value: 'silver1', label: 'Silver I' },
                { value: 'silver2', label: 'Silver II' },
                { value: 'silverelite', label: 'Silver Elite' },
                { value: 'silverelitefm', label: 'Silver Elite Master' },
                { value: 'goldnova1', label: 'Gold Nova I' },
                { value: 'goldnova2', label: 'Gold Nova II' },
                { value: 'goldnova3', label: 'Gold Nova III' },
                { value: 'goldnovam', label: 'Gold Nova Master' },
                { value: 'mg1', label: 'Master Guardian I' },
                { value: 'mg2', label: 'Master Guardian II' },
                { value: 'mge', label: 'Master Guardian Elite' },
                { value: 'dmg', label: 'Distinguished Master Guardian' },
                { value: 'le', label: 'Legendary Eagle' },
                { value: 'lem', label: 'Legendary Eagle Master' },
                { value: 'supreme', label: 'Supreme Master First Class' },
                { value: 'global', label: 'Global Elite' }
            ],
            'lol': [
                { value: 'iron', label: 'Iron' },
                { value: 'bronze', label: 'Bronze' },
                { value: 'silver', label: 'Silver' },
                { value: 'gold', label: 'Gold' },
                { value: 'platinum', label: 'Platinum' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'master', label: 'Master' },
                { value: 'grandmaster', label: 'Grandmaster' },
                { value: 'challenger', label: 'Challenger' }
            ],
            'apex': [
                { value: 'bronze', label: 'Bronze' },
                { value: 'silver', label: 'Silver' },
                { value: 'gold', label: 'Gold' },
                { value: 'platinum', label: 'Platinum' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'master', label: 'Master' },
                { value: 'predator', label: 'Apex Predator' }
            ],
            'fortnite': [
                { value: 'open', label: 'Open League' },
                { value: 'contender', label: 'Contender League' },
                { value: 'champion', label: 'Champion League' }
            ],
            'dota2': [
                { value: 'herald', label: 'Herald' },
                { value: 'guardian', label: 'Guardian' },
                { value: 'crusader', label: 'Crusader' },
                { value: 'archon', label: 'Archon' },
                { value: 'legend', label: 'Legend' },
                { value: 'ancient', label: 'Ancient' },
                { value: 'divine', label: 'Divine' },
                { value: 'immortal', label: 'Immortal' }
            ],
            'overwatch': [
                { value: 'bronze', label: 'Bronze' },
                { value: 'silver', label: 'Silver' },
                { value: 'gold', label: 'Gold' },
                { value: 'platinum', label: 'Platinum' },
                { value: 'diamond', label: 'Diamond' },
                { value: 'master', label: 'Master' },
                { value: 'grandmaster', label: 'Grandmaster' },
                { value: 'toptier', label: 'Top 500' }
            ],
            'default': [
                { value: '1', label: 'Beginner' },
                { value: '2', label: 'Casual' },
                { value: '3', label: 'Intermediate' },
                { value: '4', label: 'Advanced' },
                { value: '5', label: 'Expert' }
            ]
        };
        
        // Check for game key in different formats
        const gameKey = game.toLowerCase();
        
        // Return rank array for the game or default if not found
        return gameRanks[gameKey] || gameRanks['default'];
    }
    
    // Generate demo lobbies for testing when no real lobbies exist
    generateDemoLobbies() {
        const gameTypes = window.APP_CONFIG?.GAME_TYPES || ['FPS', 'MOBA', 'RPG', 'Strategy', 'Sports', 'Racing', 'Other'];
        const demoUserId = localStorage.getItem('userId') || 'demo-user';
        
        const demoLobbies = [
            {
                _id: 'demo-lobby-1',
                name: 'Apex Legends Squad',
                game: 'FPS',
                gameName: 'Apex Legends',
                gameType: 'apex',
                gameCategory: 'battle-royale',
                description: 'Looking for skilled players for ranked grind',
                maxPlayers: 3,
                currentPlayers: 1,
                status: 'open',
                skillLevel: 4,
                rank: 'diamond', // Game-specific rank for Apex Legends
                region: 'na',
                host: demoUserId,
                hostInfo: {
                    _id: demoUserId,
                    username: localStorage.getItem('username') || 'DemoUser',
                    email: localStorage.getItem('email') || 'demo@example.com'
                },
                createdAt: new Date().toISOString(),
                gameImage: '../resources/apex.png.png'
            },
            {
                _id: 'demo-lobby-2',
                name: 'League of Legends Team',
                game: 'MOBA',
                gameName: 'League of Legends',
                gameType: 'lol',
                gameCategory: 'moba',
                description: 'Casual gaming, all ranks welcome',
                maxPlayers: 5,
                currentPlayers: 3,
                status: 'open',
                skillLevel: 2,
                rank: 'silver', // Game-specific rank for League of Legends
                region: 'eu',
                host: 'other-user-1',
                hostInfo: {
                    _id: 'other-user-1',
                    username: 'GamerPro99',
                    email: 'pro@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
                gameImage: '../resources/leageofLegend.png.png'
            },
            {
                _id: 'demo-lobby-3',
                name: 'Valorant Competitive',
                game: 'FPS',
                gameName: 'Valorant',
                gameType: 'valorant',
                gameCategory: 'fps',
                description: 'Looking for Diamond+ players for competitive team',
                maxPlayers: 5,
                currentPlayers: 5,
                status: 'full',
                skillLevel: 5,
                rank: 'immortal', // Game-specific rank for Valorant
                region: 'na',
                host: 'other-user-2',
                hostInfo: {
                    _id: 'other-user-2',
                    username: 'TacticalGamer',
                    email: 'tactical@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                gameImage: '../resources/Valorant-Logo-PNG-Image.png'
            },
            {
                _id: 'demo-lobby-4',
                name: 'CS2 Competitive Matchmaking',
                game: 'FPS',
                gameName: 'Counter-Strike 2',
                gameType: 'csgo',
                gameCategory: 'fps',
                description: 'Looking for Gold Nova+ players for MM',
                maxPlayers: 5, 
                currentPlayers: 3,
                status: 'open',
                skillLevel: 3,
                rank: 'goldnova3', // Game-specific rank for CS2
                region: 'eu',
                host: 'other-user-3',
                hostInfo: {
                    _id: 'other-user-3',
                    username: 'HeadshotMaster',
                    email: 'hs@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
                gameImage: '../resources/counter-strike-png-.png'
            },
            {
                _id: 'demo-lobby-5',
                name: 'Valorant Iron Team',
                game: 'FPS',
                gameName: 'Valorant',
                gameType: 'valorant',
                gameCategory: 'fps',
                description: 'Iron players only, learning the game',
                maxPlayers: 5,
                currentPlayers: 2,
                status: 'open',
                skillLevel: 1,
                rank: 'iron', // Game-specific rank for Valorant
                region: 'na',
                host: 'other-user-4',
                hostInfo: {
                    _id: 'other-user-4',
                    username: 'NewToValorant',
                    email: 'newbie@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
                gameImage: '../resources/Valorant-Logo-PNG-Image.png'
            },
            {
                _id: 'demo-lobby-6',
                name: 'Gold Valorant Team',
                game: 'FPS',
                gameName: 'Valorant',
                gameType: 'valorant',
                gameCategory: 'fps',
                description: 'Gold players looking for more',
                maxPlayers: 5,
                currentPlayers: 3,
                status: 'open',
                skillLevel: 3,
                rank: 'gold', // Game-specific rank for Valorant
                region: 'eu',
                host: 'other-user-5',
                hostInfo: {
                    _id: 'other-user-5',
                    username: 'GoldShots',
                    email: 'gold@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), // 10 hours ago
                gameImage: '../resources/Valorant-Logo-PNG-Image.png'
            },
            {
                _id: 'demo-lobby-7',
                name: 'Apex Casual',
                game: 'FPS',
                gameName: 'Apex Legends',
                gameType: 'apex',
                gameCategory: 'battle-royale',
                description: 'Casual Apex games, all welcome',
                maxPlayers: 3,
                currentPlayers: 1,
                status: 'open',
                skillLevel: 2,
                rank: 'silver', // Game-specific rank for Apex Legends
                region: 'na',
                host: 'other-user-6',
                hostInfo: {
                    _id: 'other-user-6',
                    username: 'CasualGamer',
                    email: 'casual@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
                gameImage: '../resources/apex.png.png'
            },
            // Add some RPG lobbies for testing
            {
                _id: 'demo-lobby-8',
                name: 'Minecraft Building',
                game: 'RPG',
                gameName: 'Minecraft',
                gameType: 'minecraft',
                gameCategory: 'rpg',
                description: 'Creative building server',
                maxPlayers: 10,
                currentPlayers: 3,
                status: 'open',
                skillLevel: 2,
                rank: 'any',
                region: 'eu',
                host: 'other-user-7',
                hostInfo: {
                    _id: 'other-user-7',
                    username: 'CreativeBuild',
                    email: 'build@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
                gameImage: '../resources/default-game.png'
            }
        ];
        
        return demoLobbies;
    }
    
    // Helper to get current user ID
    getUserId() {
        try {
            // Try to get user ID from local storage
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) {
                return 'current_user'; // Default ID for demo mode
            }
            
            const userInfo = JSON.parse(userInfoStr);
            const userId = userInfo._id || 'current_user';
            console.log('Current user ID:', userId);
            console.log('User info:', userInfo);
            return userId;
        } catch (e) {
            console.error('Error getting user ID:', e);
            return 'current_user'; // Fallback ID for demo mode
        }
    }
    
    // Helper to load lobbies from localStorage (used as fallback)
    loadLocalLobbies(filters = {}) {
        console.log('Loading lobbies from localStorage with filters:', filters);
        
        // Get lobbies from localStorage
        let lobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
        
        // Clear and recreate lobbies if needed - fixing potential data issues
        if (!lobbies || lobbies.length === 0 || localStorage.getItem('reset_lobbies') === 'true') {
            localStorage.removeItem('reset_lobbies');
            lobbies = this.clearAndReinitLobbies();
        }
        
        // Fix any issues with lobby data
        lobbies = this.fixLobbyData(lobbies);
        
        // Ensure all lobbies have appropriate game-specific rank data based on their skillLevel
        if (filters.game) {
            // Enrich with game-specific ranks
            lobbies = this.enrichLobbyRankData(lobbies, filters.game);
            console.log('Lobbies after rank enrichment:', lobbies);
        }
        
        // Apply filters if any
        if (Object.keys(filters).length > 0) {
            lobbies = this.filterLobbies(lobbies, filters);
        }
        
        // Display the lobbies
        this.displayLobbies(lobbies);
        return lobbies;
    }
    
    // Fix any issues with lobby data
    fixLobbyData(lobbies) {
        console.log('Checking for inconsistent lobby data...');
        let hasChanges = false;
        
        const fixedLobbies = lobbies.map(lobby => {
            const fixedLobby = {...lobby};
            
            console.log(`Fixing lobby "${fixedLobby.name}": game=${fixedLobby.game}, gameType=${fixedLobby.gameType}`);
            
            // Check for missing or incorrect region
            if (!fixedLobby.region || typeof fixedLobby.region !== 'string') {
                console.log(`Fixing missing region in lobby: ${fixedLobby.name}`);
                fixedLobby.region = 'na'; // Default to North America
                hasChanges = true;
            }
            
            // Make sure region is stored as the correct code
            if (fixedLobby.region === 'North America') fixedLobby.region = 'na';
            if (fixedLobby.region === 'Europe') fixedLobby.region = 'eu';
            if (fixedLobby.region === 'Asia') fixedLobby.region = 'asia';
            if (fixedLobby.region === 'South America') fixedLobby.region = 'sa';
            if (fixedLobby.region === 'Oceania') fixedLobby.region = 'oceania';
            
            // Check for missing or incorrect rank
            if (!fixedLobby.rank || typeof fixedLobby.rank !== 'string') {
                console.log(`Fixing missing rank in lobby: ${fixedLobby.name}`);
                fixedLobby.rank = 'any'; // Default to any rank
                hasChanges = true;
            }
            
            // Make sure skill level is numeric
            if (typeof fixedLobby.skillLevel !== 'number') {
                console.log(`Fixing skillLevel in lobby: ${fixedLobby.name}`);
                fixedLobby.skillLevel = 3; // Default to middle
                hasChanges = true;
            }
            
            // Fix game/gameType inconsistencies
            // First ensure the lobby has a game property
            if (!fixedLobby.game) {
                console.log(`Setting missing game property for: ${fixedLobby.name}`);
                
                // Try to infer from gameType or gameName
                if (fixedLobby.gameType) {
                    const gameTypeCategories = {
                        'valorant': 'FPS',
                        'csgo': 'FPS',
                        'cod': 'FPS',
                        'overwatch': 'FPS',
                        'lol': 'MOBA',
                        'dota2': 'MOBA',
                        'apex': 'Battle Royale',
                        'fortnite': 'Battle Royale',
                        'pubg': 'Battle Royale',
                        'warzone': 'Battle Royale',
                        'minecraft': 'RPG',
                        'wow': 'RPG'
                    };
                    
                    fixedLobby.game = gameTypeCategories[fixedLobby.gameType.toLowerCase()] || 'Other';
                    hasChanges = true;
                } else if (fixedLobby.gameName) {
                    // Try to infer category from name
                    const gameNameMap = {
                        'valorant': 'FPS',
                        'counter-strike': 'FPS',
                        'cs2': 'FPS',
                        'call of duty': 'FPS',
                        'overwatch': 'FPS',
                        'league of legends': 'MOBA',
                        'dota': 'MOBA',
                        'apex legends': 'Battle Royale',
                        'fortnite': 'Battle Royale',
                        'playerunknown': 'Battle Royale',
                        'minecraft': 'RPG',
                        'world of warcraft': 'RPG'
                    };
                    
                    // Search for matches in the game name
                    let found = false;
                    for (const [key, value] of Object.entries(gameNameMap)) {
                        if (fixedLobby.gameName.toLowerCase().includes(key)) {
                            fixedLobby.game = value;
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        fixedLobby.game = 'Other';
                    }
                    
                    hasChanges = true;
                } else {
                    fixedLobby.game = 'Other';
                    hasChanges = true;
                }
            }
            
            // Then ensure the lobby has a gameType property
            if (!fixedLobby.gameType) {
                console.log(`Setting missing gameType property for: ${fixedLobby.name}`);
                
                // Map specific games to their types
                const gameToType = {
                    'VALORANT': 'valorant',
                    'Valorant': 'valorant',
                    'valorant': 'valorant',
                    'CS2': 'csgo',
                    'Counter-Strike 2': 'csgo',
                    'CS:GO': 'csgo',
                    'csgo': 'csgo',
                    'League of Legends': 'lol',
                    'LoL': 'lol',
                    'lol': 'lol',
                    'Apex Legends': 'apex',
                    'Apex': 'apex',
                    'apex': 'apex',
                    'Fortnite': 'fortnite',
                    'fortnite': 'fortnite',
                    'Call of Duty': 'cod',
                    'COD': 'cod',
                    'cod': 'cod',
                    'Warzone': 'warzone',
                    'warzone': 'warzone',
                    'Dota 2': 'dota2',
                    'DOTA 2': 'dota2',
                    'dota2': 'dota2',
                    'Overwatch': 'overwatch',
                    'Overwatch 2': 'overwatch',
                    'overwatch': 'overwatch',
                    'Minecraft': 'minecraft',
                    'minecraft': 'minecraft',
                    'World of Warcraft': 'wow',
                    'WoW': 'wow',
                    'wow': 'wow'
                };
                
                // Try to match from game property first
                if (fixedLobby.game in gameToType) {
                    fixedLobby.gameType = gameToType[fixedLobby.game];
                    hasChanges = true;
                }
                // Then try to match from gameName property
                else if (fixedLobby.gameName) {
                    let found = false;
                    for (const [key, value] of Object.entries(gameToType)) {
                        if (fixedLobby.gameName.includes(key)) {
                            fixedLobby.gameType = value;
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        // Default based on game category
                        const categoryDefaults = {
                            'FPS': 'valorant',
                            'MOBA': 'lol',
                            'Battle Royale': 'apex',
                            'RPG': 'minecraft',
                            'Other': 'unknown'
                        };
                        
                        fixedLobby.gameType = categoryDefaults[fixedLobby.game] || 'unknown';
                    }
                    
                    hasChanges = true;
                } else {
                    // Assign a default based on game category
                    const categoryDefaults = {
                        'FPS': 'valorant',
                        'MOBA': 'lol',
                        'Battle Royale': 'apex',
                        'RPG': 'minecraft',
                        'Other': 'unknown'
                    };
                    
                    fixedLobby.gameType = categoryDefaults[fixedLobby.game] || 'unknown';
                    hasChanges = true;
                }
            }
            
            // Make sure the lobby has a gameCategory property for tab filtering
            if (!fixedLobby.gameCategory) {
                console.log(`Setting missing gameCategory property for: ${fixedLobby.name}`);
                
                const gameTypeToCategory = {
                    'valorant': 'fps',
                    'csgo': 'fps',
                    'cod': 'fps',
                    'overwatch': 'fps',
                    'lol': 'moba',
                    'dota2': 'moba',
                    'apex': 'battle-royale',
                    'fortnite': 'battle-royale',
                    'pubg': 'battle-royale',
                    'warzone': 'battle-royale',
                    'minecraft': 'rpg',
                    'wow': 'rpg',
                    'elder-scrolls': 'rpg',
                    'fallout': 'rpg'
                };
                
                if (fixedLobby.gameType && gameTypeToCategory[fixedLobby.gameType.toLowerCase()]) {
                    fixedLobby.gameCategory = gameTypeToCategory[fixedLobby.gameType.toLowerCase()];
                    console.log(`Set gameCategory to ${fixedLobby.gameCategory} based on gameType ${fixedLobby.gameType}`);
                    hasChanges = true;
                }
                // If we can't determine from gameType, check the game property
                else if (fixedLobby.game) {
                    const gameCategoryMap = {
                        'FPS': 'fps',
                        'MOBA': 'moba',
                        'Battle Royale': 'battle-royale',
                        'RPG': 'rpg'
                    };
                    
                    if (gameCategoryMap[fixedLobby.game]) {
                        fixedLobby.gameCategory = gameCategoryMap[fixedLobby.game];
                        console.log(`Set gameCategory to ${fixedLobby.gameCategory} based on game ${fixedLobby.game}`);
                        hasChanges = true;
                    } else {
                        fixedLobby.gameCategory = 'other';
                        console.log(`Set default gameCategory to 'other'`);
                        hasChanges = true;
                    }
                } else {
                    fixedLobby.gameCategory = 'other';
                    console.log(`Set default gameCategory to 'other'`);
                    hasChanges = true;
                }
            }
            
            console.log(`After fixing, lobby "${fixedLobby.name}": game=${fixedLobby.game}, gameType=${fixedLobby.gameType}, gameCategory=${fixedLobby.gameCategory}`);
            
            return fixedLobby;
        });
        
        // If any fixes were applied, update localStorage
        if (hasChanges) {
            console.log('Saving fixed lobby data to localStorage');
            localStorage.setItem('lobbies', JSON.stringify(fixedLobbies));
        }
        
        return fixedLobbies;
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        try {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            // Icon based on notification type
            let icon = 'info-circle';
            if (type === 'success') icon = 'check-circle';
            if (type === 'error') icon = 'exclamation-circle';
            if (type === 'warning') icon = 'exclamation-triangle';
            
            notification.innerHTML = `
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            `;
            
            const container = document.querySelector('.notifications-container');
            if (container) {
                container.appendChild(notification);
                
                // Auto-remove notification after 5 seconds
                setTimeout(() => {
                    notification.classList.add('fade-out');
                    setTimeout(() => notification.remove(), 300);
                }, 5000);
            } else {
                console.warn('Notification container not found');
                console.log(message, type);
            }
        } catch (e) {
            console.error('Error showing notification:', e);
        }
    }
}

// Attach to window object for global access
window.LobbiesModule = LobbiesModule;

// Create and initialize a global Lobby instance
window.Lobby = new LobbiesModule();

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded in lobbies.js');
    
    // Create lobbies module instance
    window.Lobby = new LobbiesModule();
    
    // Check if we need to force refresh
    const urlParams = new URLSearchParams(window.location.search);
    let shouldRefresh = urlParams.get('refresh') === 'true';
    
    // Get game filter from URL if present
    const gameFilter = urlParams.get('game');
    console.log('URL game parameter:', gameFilter);
    
    // Check if we just joined a lobby through an invitation
    const justJoinedLobby = localStorage.getItem('just_joined_lobby') === 'true';
    if (justJoinedLobby) {
        // Clear the flag
        localStorage.removeItem('just_joined_lobby');
        console.log('Detected recent lobby join, forcing refresh of lobby data');
        shouldRefresh = true;
    }
    
    // Prepare filters based on URL parameters
    const filters = {};
    if (gameFilter) {
        filters.game = gameFilter;
        console.log('Setting initial game filter:', gameFilter);
        
        // Also update the filter UI if it exists
        const gameFilterDropdown = document.querySelector('#gameFilter');
        if (gameFilterDropdown) {
            // Find the option that matches our game filter or use a case-insensitive approach
            let found = false;
            for (const option of gameFilterDropdown.options) {
                if (option.value.toLowerCase() === gameFilter.toLowerCase()) {
                    gameFilterDropdown.value = option.value;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                console.log(`No exact match found for game: ${gameFilter}`);
            }
        }
    }
    
    // Load lobbies, clear cache if coming back from accepting an invite
    if (shouldRefresh) {
        console.log('Forcing refresh of lobby data');
        localStorage.removeItem('lobbies');
        window.Lobby.loadLobbies(filters);
    } else {
        window.Lobby.loadLobbies(filters);
    }
});