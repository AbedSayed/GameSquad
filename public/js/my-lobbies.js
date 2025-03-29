// My Lobbies page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    if (typeof window.Auth !== 'undefined' && typeof window.Auth.isLoggedIn === 'function') {
        if (!window.Auth.isLoggedIn()) {
            // Redirect to login page if not logged in
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
    } else {
        // Fallback to basic token check
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
    }

    // Initialize the MyLobbies module
    MyLobbies.init();
});

// MyLobbies namespace for handling user's lobbies
const MyLobbies = {
    activeFilter: 'all', // Default filter
    myLobbies: [],

    init() {
        // Load user's lobbies
        this.loadMyLobbies();

        // Setup filter tab event listeners
        const filterTabs = document.querySelectorAll('.tab-btn');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update filter and refresh display
                this.activeFilter = tab.dataset.filter;
                this.displayLobbies(this.myLobbies);
            });
        });
    },

    async loadMyLobbies() {
        try {
            // Show loading state
            this.showLoadingState();

            // Get user information
            const userInfo = this.getUserInfo();
            if (!userInfo || !userInfo.token) {
                throw new Error('Not authenticated');
            }

            console.log('Fetching lobbies for user:', userInfo._id);

            // Make API request to get user's lobbies
            const response = await fetch(`${window.APP_CONFIG.API_URL}/users/lobbies`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${userInfo.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load lobbies');
            }

            const result = await response.json();
            console.log('Received lobbies response:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to load lobbies');
            }
            
            this.myLobbies = result.data || [];
            console.log(`Found ${this.myLobbies.length} lobbies for this user`);
            
            // Display the lobbies
            this.displayLobbies(this.myLobbies);
        } catch (error) {
            console.error('Error loading my lobbies:', error);
            this.showError(error.message);
        }
    },

    displayLobbies(lobbies) {
        const container = document.querySelector('.lobbies-grid');
        const noLobbiesElement = document.querySelector('.no-lobbies');
        
        // Clear previous content
        container.innerHTML = '';

        // Filter lobbies based on active filter
        let filteredLobbies = [...lobbies];
        const userInfo = this.getUserInfo();
        const userId = userInfo?._id;

        if (this.activeFilter === 'hosted') {
            filteredLobbies = lobbies.filter(lobby => lobby.host._id === userId);
        } else if (this.activeFilter === 'joined') {
            filteredLobbies = lobbies.filter(lobby => 
                lobby.host._id !== userId && 
                lobby.players.some(player => 
                    (player.user._id === userId) || 
                    (typeof player.user === 'string' && player.user === userId)
                )
            );
        }

        // Show/hide no lobbies message
        if (!filteredLobbies.length) {
            container.classList.add('hidden');
            noLobbiesElement.classList.remove('hidden');
            return;
        } else {
            container.classList.remove('hidden');
            noLobbiesElement.classList.add('hidden');
        }

        // Create lobby cards
        filteredLobbies.forEach(lobby => {
            const isHost = userId === lobby.host._id;
            
            const card = document.createElement('div');
            card.className = 'lobby-card';
            
            // Determine status class
            const statusClass = `status-${lobby.status || 'waiting'}`;
            
            // Format game details
            const gameType = lobby.gameType || 'Unknown';
            const rankDisplay = lobby.rank && lobby.rank !== 'any' 
                ? this.formatRank(lobby.rank, gameType) 
                : 'Any Rank';
            const regionDisplay = lobby.region && lobby.region !== 'any'
                ? this.formatRegion(lobby.region)
                : 'Any Region';
            const languageDisplay = lobby.language && lobby.language !== 'any'
                ? this.formatLanguage(lobby.language)
                : 'Any Language';
            
            card.innerHTML = `
                <div class="lobby-header">
                    <div class="lobby-game">
                        <span>${this.escapeHtml(gameType)}</span>
                    </div>
                    <span class="lobby-status ${statusClass}">${lobby.status || 'waiting'}</span>
                </div>
                <div class="lobby-body">
                    <h3 class="lobby-name">${this.escapeHtml(lobby.name || 'Unnamed Lobby')}</h3>
                    
                    <div class="game-details">
                        <div class="game-detail-item">
                            <i class="fas fa-trophy"></i>
                            <span>${rankDisplay}</span>
                        </div>
                        <div class="game-detail-item">
                            <i class="fas fa-globe"></i>
                            <span>${regionDisplay}</span>
                        </div>
                        <div class="game-detail-item">
                            <i class="fas fa-language"></i>
                            <span>${languageDisplay}</span>
                        </div>
                        <div class="game-detail-item">
                            <i class="fas fa-users"></i>
                            <span>Players: ${lobby.currentPlayers || 0}/${lobby.maxPlayers || 5}</span>
                        </div>
                    </div>
                    
                    <div class="lobby-info">
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <span>Host: ${this.escapeHtml(lobby.host.username)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-${isHost ? 'crown' : 'user-check'}"></i>
                            <span>${isHost ? 'You are hosting' : 'You are a member'}</span>
                        </div>
                    </div>
                    
                    <div class="lobby-actions">
                        <button class="lobby-btn ${isHost ? 'manage-btn' : 'join-btn'}" data-lobby-id="${lobby._id}">
                            <i class="fas fa-${isHost ? 'cog' : 'sign-in-alt'}"></i> ${isHost ? 'Manage' : 'Return to Lobby'}
                        </button>
                        <a href="lobby-details.html?id=${lobby._id}" class="lobby-btn details-btn">
                            <i class="fas fa-info-circle"></i> Details
                        </a>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        // Add event listeners to buttons
        this.setupButtonHandlers();
    },

    setupButtonHandlers() {
        // Setup manage button handlers
        const manageButtons = document.querySelectorAll('.manage-btn');
        manageButtons.forEach(button => {
            button.addEventListener('click', () => {
                const lobbyId = button.getAttribute('data-lobby-id');
                if (lobbyId) {
                    window.location.href = `lobby-details.html?id=${lobbyId}`;
                }
            });
        });

        // Setup join button handlers
        const joinButtons = document.querySelectorAll('.join-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', () => {
                const lobbyId = button.getAttribute('data-lobby-id');
                if (lobbyId) {
                    window.location.href = `lobby-details.html?id=${lobbyId}`;
                }
            });
        });
    },

    showLoadingState() {
        const container = document.querySelector('.lobbies-grid');
        const noLobbiesElement = document.querySelector('.no-lobbies');
        
        container.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading your lobbies...</p>
            </div>
        `;
        
        container.classList.remove('hidden');
        noLobbiesElement.classList.add('hidden');
    },

    showError(message) {
        const container = document.querySelector('.lobbies-grid');
        
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="MyLobbies.loadMyLobbies()" class="retry-btn">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    },

    getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    },

    // Helper formatting functions
    formatRank(rank, gameType) {
        if (!rank) return 'Any';
        
        // Convert rank to proper case
        const formattedRank = rank.split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        // Special formatting for specific games
        if (gameType.toLowerCase() === 'csgo') {
            if (rank.includes('mg')) return rank.toUpperCase();
            if (rank === 'dmg') return 'DMG';
            if (rank === 'le') return 'LE';
            if (rank === 'lem') return 'LEM';
        }
        
        return formattedRank;
    },

    formatRegion(region) {
        if (!region) return 'Any';
        
        const regionMap = {
            'na': 'North America',
            'eu': 'Europe',
            'asia': 'Asia',
            'oceania': 'Oceania',
            'sa': 'South America'
        };
        
        return regionMap[region.toLowerCase()] || region;
    },

    formatLanguage(language) {
        if (!language) return 'Any';
        
        // Convert language code to proper case
        return language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
    },

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}; 