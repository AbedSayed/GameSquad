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
        
        console.log('Normalized filters:', filters);
        
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
        
        // Separate my lobbies and other lobbies
        const myLobbies = [];
        const otherLobbies = [];
        
        lobbies.forEach(lobby => {
            // Check if this lobby belongs to the current user
            const isOwned = lobby.host === userId || 
                           (typeof lobby.host === 'object' && lobby.host?._id === userId) ||
                           lobby.host === 'current_user' ||
                           (lobby.hostInfo && (lobby.hostInfo._id === userId || lobby.hostInfo._id === 'current_user'));
            
            console.log(`Lobby ${lobby.name} - host: ${JSON.stringify(lobby.host)}, isOwned: ${isOwned}`);
            
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
                        <p>You haven't created any lobbies yet</p>
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
            'fortnite': '../resources/default-game.png',
            'dota2': '../resources/default-game.png',
            'overwatch': '../resources/default-game.png',
            'rocketleague': '../resources/default-game.png',
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
                        <span>${lobby.currentPlayers || 1}/${lobby.maxPlayers || 4}</span>
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
                <div class="skill-level">
                    <span>Skill Level:</span>
                    <div class="skill-dots">
                        ${this.generateSkillDots(lobby.skillLevel || 1)}
                    </div>
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
                cleanFilters[key] = value.toLowerCase();
            }
        }
        
        console.log('Using clean filters:', cleanFilters);
        
        // Debug - log all lobbies with their region and rank values 
        lobbies.forEach(lobby => {
            console.log(`Lobby "${lobby.name}": game=${lobby.game}, region=${lobby.region}, rank=${lobby.rank}`);
        });
        
        const filteredLobbies = lobbies.filter(lobby => {
            // Game filter
            if (cleanFilters.game && lobby.game && lobby.game.toLowerCase() !== cleanFilters.game) {
                console.log(`Filtering out "${lobby.name}" - game mismatch: ${lobby.game} vs ${cleanFilters.game}`);
                return false;
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
            if (cleanFilters.rank && lobby.rank) {
                const lobbyRank = lobby.rank.toLowerCase();
                if (lobbyRank !== cleanFilters.rank && !lobbyRank.includes(cleanFilters.rank)) {
                    console.log(`Filtering out "${lobby.name}" - rank mismatch: ${lobbyRank} vs ${cleanFilters.rank}`);
                    return false;
                }
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
                description: 'Looking for skilled players for ranked grind',
                maxPlayers: 3,
                currentPlayers: 1,
                status: 'open',
                skillLevel: 4,
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
                description: 'Casual gaming, all ranks welcome',
                maxPlayers: 5,
                currentPlayers: 3,
                status: 'open',
                skillLevel: 2,
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
                description: 'Looking for Diamond+ players for competitive team',
                maxPlayers: 5,
                currentPlayers: 5,
                status: 'full',
                skillLevel: 5,
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
                name: 'Minecraft Building',
                game: 'Other',
                gameName: 'Minecraft',
                gameType: 'minecraft',
                description: 'Creative mode building project, bring your ideas!',
                maxPlayers: 8,
                currentPlayers: 3,
                status: 'open',
                skillLevel: 1,
                host: 'other-user-3',
                hostInfo: {
                    _id: 'other-user-3',
                    username: 'CreativeMiner',
                    email: 'miner@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
                gameImage: '../resources/minecraft.png'
            },
            {
                _id: 'demo-lobby-5',
                name: 'Fortnite Squad',
                game: 'FPS',
                gameName: 'Fortnite',
                gameType: 'fortnite',
                description: 'Looking for a fourth for squads',
                maxPlayers: 4,
                currentPlayers: 3,
                status: 'open',
                skillLevel: 3,
                host: 'other-user-4',
                hostInfo: {
                    _id: 'other-user-4',
                    username: 'FortnitePro',
                    email: 'fortnite@example.com'
                },
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
                gameImage: '../resources/fortnite.png'
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
        
        // Fix any inconsistent region values
        lobbies = this.fixLobbyData(lobbies);
        
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
            // If we have a game value that looks like a game identifier (not a category)
            if (fixedLobby.game && ['valorant', 'csgo', 'lol', 'apex', 'fortnite', 'dota2', 'overwatch', 'rocketleague'].includes(fixedLobby.game.toLowerCase())) {
                console.log(`Fixing game value in lobby: ${fixedLobby.name}, current game=${fixedLobby.game}`);
                // This is a direct game value from the form, we need to set gameType to match
                fixedLobby.gameType = fixedLobby.game.toLowerCase();
                hasChanges = true;
            }
            
            // Special handling for League of Legends
            if (fixedLobby.game === 'League of Legends' || 
                fixedLobby.gameName === 'League of Legends' || 
                fixedLobby.game === 'LoL' || 
                (fixedLobby.gameType && fixedLobby.gameType.toLowerCase() === 'lol')) {
                console.log(`Fixing League of Legends lobby: ${fixedLobby.name}`);
                fixedLobby.game = 'MOBA'; // Game category
                fixedLobby.gameName = 'League of Legends'; // Full game name
                fixedLobby.gameType = 'lol'; // Game identifier for images
                hasChanges = true;
            }
            
            return fixedLobby;
        });
        
        // If any fixes were applied, update localStorage
        if (hasChanges) {
            console.log('Saving fixed lobby data to localStorage');
            localStorage.setItem('lobbies', JSON.stringify(fixedLobbies));
        }
        
        return fixedLobbies;
    }
    
    // Generate skill level dots
    generateSkillDots(level) {
        level = parseInt(level) || 1;
        let dots = '';
        
        // Make sure level is between 1 and 5
        level = Math.max(1, Math.min(5, level));
        
        for (let i = 1; i <= 5; i++) {
            if (i <= level) {
                dots += '<span class="skill-dot active"></span>';
            } else {
                dots += '<span class="skill-dot"></span>';
            }
        }
        
        return dots;
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded in lobbies.js');
    
    // Check if essential elements exist
    const myLobbiesElement = document.getElementById('myLobbies');
    const otherLobbiesElement = document.getElementById('otherLobbies');
    
    console.log('Essential elements check:', {
        myLobbies: myLobbiesElement ? 'Found' : 'Missing',
        otherLobbies: otherLobbiesElement ? 'Found' : 'Missing'
    });
    
    if (!myLobbiesElement || !otherLobbiesElement) {
        console.error('Essential lobby container elements missing!');
        alert('Error loading lobby data. Please try refreshing the page.');
    }
    
    // Check for URL parameters to apply filters
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters = {};
    
    // Get game parameter from URL, if present
    const gameParam = urlParams.get('game');
    if (gameParam) {
        initialFilters.game = window.Lobby.normalizeGameName(gameParam);
        console.log('Found game parameter in URL:', gameParam);
        console.log('Normalized to:', initialFilters.game);
    }
    
    // Get additional filters from URL (rank, region, status) if present
    ['rank', 'region', 'status'].forEach(param => {
        const value = urlParams.get(param);
        if (value) {
            initialFilters[param] = value;
        }
    });
    
    // Log the initial filters 
    console.log('Loading lobbies with initial filters:', initialFilters);
    
    // Load lobbies with URL parameters as filters
    window.Lobby.loadLobbies(initialFilters);
});