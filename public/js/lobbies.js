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
        
        // Get current user ID
        const userId = this.getUserId();
        console.log('Current user ID:', userId);
        
        // Separate lobbies into my lobbies and other lobbies
        const myLobbies = [];
        const otherLobbies = [];
        
        lobbies.forEach(lobby => {
            // Check if user is the host
            let isUserHost = false;
            // Handle string ID comparison or object ID comparison
            if (typeof lobby.host === 'string') {
                isUserHost = lobby.host === userId;
            } else if (lobby.host && lobby.host._id) {
                isUserHost = lobby.host._id === userId;
            } else if (lobby.hostInfo && lobby.hostInfo._id) {
                isUserHost = lobby.hostInfo._id === userId;
            }
            
            // Check if user is a player in this lobby
            let isUserPlayer = false;
            if (lobby.players && Array.isArray(lobby.players)) {
                console.log(`Checking if user ${userId} is a player in lobby ${lobby.name} with players:`, lobby.players);
                
                isUserPlayer = lobby.players.some(player => {
                    if (typeof player === 'string') {
                        return player === userId;
                    } else if (player.user) {
                        const isMatch = (typeof player.user === 'string' && player.user === userId) || 
                               (player.user._id && player.user._id === userId);
                        if (isMatch) {
                            console.log(`Found user ${userId} as player in lobby ${lobby.name}`);
                        }
                        return isMatch;
                    }
                    return false;
                });
            }
            
            // Add to appropriate list
            if (isUserHost || isUserPlayer) {
                myLobbies.push(lobby);
            } else {
                otherLobbies.push(lobby);
            }
        });
        
        console.log(`Found ${myLobbies.length} of my lobbies and ${otherLobbies.length} other lobbies`);
        
        // Display my lobbies if container exists
        if (myLobbiesContainer) {
            if (myLobbies.length > 0) {
                myLobbies.forEach(lobby => {
                    const lobbyCard = this.createLobbyCard(lobby, true);
                    myLobbiesContainer.appendChild(lobbyCard);
                });
            } else {
                myLobbiesContainer.innerHTML = `
                    <div class="no-lobbies">
                        <i class="fas fa-info-circle"></i>
                        <p>You haven't created any lobbies yet</p>
                        <a href="pages/create-lobby.html" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create Lobby
                        </a>
                    </div>
                `;
            }
        }
        
        // Display other lobbies if container exists
        if (otherLobbiesContainer) {
            if (otherLobbies.length > 0) {
                otherLobbies.forEach(lobby => {
                    const lobbyCard = this.createLobbyCard(lobby, false);
                    otherLobbiesContainer.appendChild(lobbyCard);
                });
            } else {
                otherLobbiesContainer.innerHTML = `
                    <div class="no-lobbies">
                        <i class="fas fa-info-circle"></i>
                        <p>No lobbies available</p>
                        <p class="sub-message">Check back later or try different filters</p>
                    </div>
                `;
            }
        }
        
        // Update lobby counts in the section headers
        const myLobbiesCount = document.getElementById('myLobbiesCount');
        const otherLobbiesCount = document.getElementById('otherLobbiesCount');
        
        if (myLobbiesCount) {
            myLobbiesCount.textContent = myLobbies.length;
        }
        
        if (otherLobbiesCount) {
            otherLobbiesCount.textContent = otherLobbies.length;
        }
    }
    
    // Create a lobby card
    createLobbyCard(lobby, isOwned) {
        // Create the card container
        const card = document.createElement('div');
        card.className = 'game-card';
        card.setAttribute('data-lobby-id', lobby._id);
        
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
            'fortnite': '../resources/fortnite.png',
            'minecraft': '../resources/minecraft.png',
            'dota2': '../resources/dota2.png'
        };
        
        // Check if we have a game type from the API
        if (lobby.gameType && gameImages[lobby.gameType.toLowerCase()]) {
            gameLogo = gameImages[lobby.gameType.toLowerCase()];
            console.log(`Found image for game type: ${lobby.gameType} -> ${gameLogo}`);
        } 
        // Fallback to gameImage if defined
        else if (lobby.gameImage) {
            gameLogo = lobby.gameImage;
        }
        // Final fallback to game name if it matches our image map
        else if (lobby.gameName && gameImages[lobby.gameName.toLowerCase()]) {
            gameLogo = gameImages[lobby.gameName.toLowerCase()];
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
        
        // Create the HTML content for the card
        card.innerHTML = `
            <div class="game-card-header">
                <div class="game-logo">
                    <img src="${gameLogo}" alt="${lobby.game || 'Game'}" onerror="this.src='../resources/default-game.png'">
                </div>
                <div class="game-type">
                    <span class="badge badge-${lobby.game?.toLowerCase() || 'default'}">${lobby.game || 'Game'}</span>
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
                window.location.href = `pages/lobby.html?id=${lobby._id}`;
            }
        });
        
        // Add button click events
        const viewButton = card.querySelector('.view-lobby');
        const joinButton = card.querySelector('.join-lobby');
        
        if (viewButton) {
            viewButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent card click
                window.location.href = `pages/lobby.html?id=${lobby._id}&manage=true`;
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
                
                window.location.href = `pages/lobby.html?id=${lobby._id}&join=true`;
            });
        }
        
        return card;
    }
    
    // Filter lobbies based on selected filters
    filterLobbies(lobbies, filters) {
        return lobbies.filter(lobby => {
            // Filter by game type if selected
            if (filters.game && filters.game !== 'all' && lobby.game !== filters.game) {
                return false;
            }
            
            // Filter by status if selected
            if (filters.status && filters.status !== 'all') {
                if (filters.status === 'open' && lobby.status !== 'open') {
                    return false;
                }
                if (filters.status === 'full' && lobby.status !== 'full') {
                    return false;
                }
                if (filters.status === 'in-progress' && lobby.status !== 'in-progress') {
                    return false;
                }
            }
            
            // Filter by skill level if selected
            if (filters.skillLevel && filters.skillLevel !== 'all') {
                const skillLevel = parseInt(filters.skillLevel);
                const lobbySkillLevel = parseInt(lobby.skillLevel || 0);
                
                if (lobbySkillLevel !== skillLevel) {
                    return false;
                }
            }
            
            // Filter by search text if provided
            if (filters.search && filters.search.trim() !== '') {
                const searchTerm = filters.search.toLowerCase().trim();
                const lobbyName = (lobby.name || '').toLowerCase();
                const lobbyDescription = (lobby.description || '').toLowerCase();
                const hostName = (lobby.hostInfo?.username || '').toLowerCase();
                
                // Check if search term is in the name, description or host name
                if (!lobbyName.includes(searchTerm) && 
                    !lobbyDescription.includes(searchTerm) && 
                    !hostName.includes(searchTerm)) {
                    return false;
                }
            }
            
            // Filter by 'my lobbies' if specified
            if (filters.myLobbies === true) {
                const userId = this.getUserId();
                return lobby.host === userId || lobby.hostInfo?._id === userId;
            }
            
            // Filter by 'other lobbies' if specified
            if (filters.otherLobbies === true) {
                const userId = this.getUserId();
                return lobby.host !== userId && lobby.hostInfo?._id !== userId;
            }
            
            // If lobby passed all filters
            return true;
        });
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
        // Try to get user ID from local storage
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const userId = userInfo._id || localStorage.getItem('userId') || null;
        console.log('Current user ID from storage:', userId);
        console.log('Full userInfo:', userInfo);
        return userId;
    }
    
    // Helper to load lobbies from localStorage (used as fallback)
    loadLocalLobbies(filters = {}) {
        console.log('Loading lobbies from localStorage with filters:', filters);
        
        // Get lobbies from localStorage
        let lobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
        
        // Create demo lobbies if none exist
        if (!lobbies || lobbies.length === 0) {
            lobbies = this.generateDemoLobbies();
            localStorage.setItem('lobbies', JSON.stringify(lobbies));
        }
        
        // Apply filters if any
        if (Object.keys(filters).length > 0) {
            lobbies = this.filterLobbies(lobbies, filters);
        }
        
        // Display the lobbies
        this.displayLobbies(lobbies);
        return lobbies;
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