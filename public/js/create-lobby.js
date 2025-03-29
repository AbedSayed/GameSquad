// JavaScript for Create Lobby functionality

// Wait for configuration to be loaded
if (!window.APP_CONFIG) {
    console.error('Configuration not loaded. Please make sure config.js is loaded first.');
}

// Game image mapping
const GAME_IMAGES = {
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('Create lobby page loaded');

    // Check if user is logged in using the Auth module
    if (typeof window.Auth !== 'undefined' && typeof window.Auth.isLoggedIn === 'function') {
        if (!window.Auth.isLoggedIn()) {
            // Store the current URL before redirecting
            localStorage.setItem('returnUrl', window.location.href);
            window.location.href = 'login.html';
            return;
        }
    } else {
        // Fallback to basic token check
        const token = localStorage.getItem('token');
        if (!token) {
            // Store the current URL before redirecting
            localStorage.setItem('returnUrl', window.location.href);
            window.location.href = 'login.html';
            return;
        }
    }

    const createLobbyForm = document.getElementById('create-lobby-form');
    const formError = document.getElementById('form-error');

    if (createLobbyForm) {
        createLobbyForm.addEventListener('submit', handleLobbyCreation);

        // Update game-specific rank options when game changes
        const gameSelect = document.getElementById('game');
        const minRankSelect = document.getElementById('min-rank');
        const regionSelect = document.getElementById('region');
        const languageSelect = document.getElementById('language');

        if (gameSelect && minRankSelect) {
            gameSelect.addEventListener('change', () => {
                updateRankOptions(gameSelect.value, minRankSelect);
            });
            
            // Setup preview updates for game details
            gameSelect.addEventListener('change', updatePreview);
            minRankSelect.addEventListener('change', updatePreview);
            regionSelect.addEventListener('change', updatePreview);
            languageSelect.addEventListener('change', updatePreview);
            
            // Initialize preview
            updatePreview();
        }
    }

    // Get form elements
    const lobbyNameInput = document.getElementById('name');
    const gameSelect = document.getElementById('game');
    const regionSelect = document.getElementById('region');
    const languageSelect = document.getElementById('language');
    const maxPlayersSelect = document.getElementById('max-players');
    const minRankSelect = document.getElementById('min-rank');
    
    // Get preview elements
    const previewName = document.getElementById('preview-name');
    const previewImage = document.getElementById('preview-image');
    const regionPreview = document.getElementById('region-preview');
    const languagePreview = document.getElementById('language-preview');
    const gameBadge = document.querySelector('.game-badge');
    
    // Game type mapping
    const gameTypeMap = {
        'valorant': 'FPS',
        'csgo': 'FPS',
        'lol': 'MOBA',
        'dota2': 'MOBA',
        'apex': 'Battle Royale',
        'fortnite': 'Battle Royale',
        'overwatch': 'FPS',
        'rocketleague': 'Sports'
    };
    
    // Game badge class mapping
    const gameBadgeClassMap = {
        'FPS': 'fps',
        'MOBA': 'moba',
        'Battle Royale': 'battle-royale',
        'RPG': 'rpg',
        'Sports': 'sports'
    };
    
    // Update preview while typing
    lobbyNameInput.addEventListener('input', function() {
        previewName.textContent = this.value || 'Your Lobby Name';
    });
    
    // Update preview when game changes
    gameSelect.addEventListener('change', function() {
        const gameValue = this.value;
        const gameType = gameTypeMap[gameValue] || 'Game';
        
        // Update game badge text and class
        gameBadge.textContent = gameType;
        
        // Remove all game badge classes
        Object.values(gameBadgeClassMap).forEach(cls => {
            gameBadge.classList.remove(cls);
        });
        
        // Add correct game badge class
        const badgeClass = gameBadgeClassMap[gameType] || 'fps';
        gameBadge.classList.add(badgeClass);
        
        // Update game image
        previewImage.src = GAME_IMAGES[gameValue] || GAME_IMAGES.default;
        previewImage.alt = this.options[this.selectedIndex].text;
    });
    
    // Update region preview
    regionSelect.addEventListener('change', function() {
        const regionMap = {
            'na': 'North America',
            'eu': 'Europe',
            'asia': 'Asia',
            'oceania': 'Oceania',
            'sa': 'South America'
        };
        
        regionPreview.textContent = regionMap[this.value] || this.options[this.selectedIndex].text;
    });
    
    // Update language preview
    languageSelect.addEventListener('change', function() {
        languagePreview.textContent = this.options[this.selectedIndex].text;
    });
    
    // Update rank preview
    minRankSelect.addEventListener('change', function() {
        const skillLevel = document.querySelector('.skill-level');
        const rankValue = this.value;
        
        // Clear existing dots
        skillLevel.innerHTML = '';
        
        // Determine skill level based on rank
        let level = 3; // Default to middle
        
        if (rankValue === 'beginner') level = 1;
        else if (rankValue === 'intermediate') level = 2;
        else if (rankValue === 'advanced') level = 4;
        else if (rankValue === 'expert') level = 5;
        
        // Create dots
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('span');
            dot.className = 'skill-level-dot' + (i < level ? ' active' : '');
            skillLevel.appendChild(dot);
        }
    });
    
    // Apply 3D hover effect to preview card
    const previewCard = document.querySelector('.preview-card');
    if (previewCard) {
        previewCard.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const angleX = (y - centerY) / 20;
            const angleY = (centerX - x) / 20;
            
            this.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        previewCard.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    }

    // Populate game-specific ranks
    function populateRanks(game) {
        const rankSelect = document.getElementById('min-rank');
        rankSelect.innerHTML = '<option value="any">Any Rank</option>';
        
        // If no game is selected, just leave with default "Any Rank" option
        if (!game) {
            return;
        }
        
        let ranks = [];
        
        switch(game) {
            case 'valorant':
                ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];
                break;
            case 'csgo':
                ranks = ['Silver I', 'Silver II', 'Silver III', 'Silver IV', 'Silver Elite', 'Silver Elite Master', 
                        'Gold Nova I', 'Gold Nova II', 'Gold Nova III', 'Gold Nova Master', 
                        'Master Guardian I', 'Master Guardian II', 'Master Guardian Elite', 
                        'Distinguished Master Guardian', 'Legendary Eagle', 'Legendary Eagle Master', 
                        'Supreme Master First Class', 'Global Elite'];
                break;
            case 'lol':
                ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];
                break;
            case 'apex':
                ranks = ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Predator'];
                break;
            default:
                ranks = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
                break;
        }
        
        // Add ranks to select
        ranks.forEach(rank => {
            const option = document.createElement('option');
            option.value = rank.toLowerCase().replace(' ', '_');
            option.textContent = rank;
            rankSelect.appendChild(option);
        });
    }
    
    // Update ranks when game changes
    gameSelect.addEventListener('change', function() {
        populateRanks(this.value);
    });
    
    // Initial population with empty ranks
    populateRanks('');
    
    // Form submission
    document.getElementById('create-lobby-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show success notification
        showNotification('Lobby created successfully! Redirecting to your lobby...', 'success');
        
        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'lobbies.html';
        }, 2000);
    });
    
    // Helper function to show notifications
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                               type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.notifications-container');
        container.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
});

/**
 * Update rank options based on selected game
 */
function updateRankOptions(game, rankSelect) {
    // Clear existing options
    rankSelect.innerHTML = '<option value="any">Any Rank</option>';
    
    // Default ranks
    let ranks = [
        { value: 'bronze', label: 'Bronze' },
        { value: 'silver', label: 'Silver' },
        { value: 'gold', label: 'Gold' },
        { value: 'platinum', label: 'Platinum' },
        { value: 'diamond', label: 'Diamond' }
    ];
    
    // Game-specific ranks
    if (game === 'valorant') {
        ranks = [
            { value: 'iron', label: 'Iron' },
            { value: 'bronze', label: 'Bronze' },
            { value: 'silver', label: 'Silver' },
            { value: 'gold', label: 'Gold' },
            { value: 'platinum', label: 'Platinum' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'ascendant', label: 'Ascendant' },
            { value: 'immortal', label: 'Immortal' },
            { value: 'radiant', label: 'Radiant' }
        ];
    } else if (game === 'lol') {
        ranks = [
            { value: 'iron', label: 'Iron' },
            { value: 'bronze', label: 'Bronze' },
            { value: 'silver', label: 'Silver' },
            { value: 'gold', label: 'Gold' },
            { value: 'platinum', label: 'Platinum' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'master', label: 'Master' },
            { value: 'grandmaster', label: 'Grandmaster' },
            { value: 'challenger', label: 'Challenger' }
        ];
    } else if (game === 'csgo') {
        ranks = [
            { value: 'silver1', label: 'Silver I' },
            { value: 'silver2', label: 'Silver II' },
            { value: 'silver3', label: 'Silver III' },
            { value: 'silver4', label: 'Silver IV' },
            { value: 'silverelite', label: 'Silver Elite' },
            { value: 'silverelitemaster', label: 'Silver Elite Master' },
            { value: 'goldnova1', label: 'Gold Nova I' },
            { value: 'goldnova2', label: 'Gold Nova II' },
            { value: 'goldnova3', label: 'Gold Nova III' },
            { value: 'goldnovamaster', label: 'Gold Nova Master' },
            { value: 'mg1', label: 'Master Guardian I' },
            { value: 'mg2', label: 'Master Guardian II' },
            { value: 'mge', label: 'Master Guardian Elite' },
            { value: 'dmg', label: 'Distinguished Master Guardian' },
            { value: 'le', label: 'Legendary Eagle' },
            { value: 'lem', label: 'Legendary Eagle Master' },
            { value: 'supreme', label: 'Supreme Master First Class' },
            { value: 'global', label: 'Global Elite' }
        ];
    }
    
    // Add ranks to select
    ranks.forEach(rank => {
        const option = document.createElement('option');
        option.value = rank.value;
        option.textContent = rank.label;
        rankSelect.appendChild(option);
    });
}

/**
 * Update the preview display with current selections
 */
function updatePreview() {
    const gameSelect = document.getElementById('game');
    const minRankSelect = document.getElementById('min-rank');
    const regionSelect = document.getElementById('region');
    const languageSelect = document.getElementById('language');
    const previewImage = document.getElementById('preview-image');
    const gameBadge = document.querySelector('.game-badge');
    
    // Update game image if game is selected
    if (gameSelect && previewImage) {
        const gameValue = gameSelect.value;
        if (gameValue) {
            // A game is selected, update the image
            previewImage.src = GAME_IMAGES[gameValue] || GAME_IMAGES.default;
            previewImage.alt = gameSelect.options[gameSelect.selectedIndex].text;
            
            // Update the game badge if it exists
            if (gameBadge) {
                const gameType = gameTypeMap[gameValue] || 'Game';
                gameBadge.textContent = gameType;
            }
        } else {
            // No game selected, use default image
            previewImage.src = GAME_IMAGES.default;
            previewImage.alt = "Game";
            
            // Update the game badge if it exists
            if (gameBadge) {
                gameBadge.textContent = "Game";
            }
        }
    }
    
    // Update rank preview
    const rankPreview = document.getElementById('rank-preview');
    if (rankPreview && minRankSelect) {
        const rankOption = minRankSelect.options[minRankSelect.selectedIndex];
        rankPreview.textContent = `Rank: ${rankOption.textContent}`;
    }
    
    // Update region preview
    const regionPreview = document.getElementById('region-preview');
    if (regionPreview && regionSelect) {
        const regionOption = regionSelect.options[regionSelect.selectedIndex];
        regionPreview.textContent = `Region: ${regionOption.textContent}`;
    }
    
    // Update language preview
    const languagePreview = document.getElementById('language-preview');
    if (languagePreview && languageSelect) {
        const languageOption = languageSelect.options[languageSelect.selectedIndex];
        languagePreview.textContent = `Language: ${languageOption.textContent}`;
    }
}

/**
 * Handle lobby creation form submission
 */
async function handleLobbyCreation(e) {
    e.preventDefault();
    
    const formError = document.getElementById('form-error');
    if (formError) {
        formError.textContent = '';
        formError.classList.add('hidden');
    }
    
    // Get user info from Auth module or localStorage
    const userInfo = getUserInfo();
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    console.log('Current user:', userInfo);
    console.log('Token available:', !!token);
    
    if (!token) {
        showLoginError('You must be logged in to create a lobby');
        
        // Store the current URL before redirecting
        localStorage.setItem('returnUrl', window.location.href);
        
        // Show notification and redirect
        showNotification('Authentication required. Please log in.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
    
    // Get form data
    const formData = new FormData(e.target);
    
    // Get region value and ensure it's normalized
    const regionValue = formData.get('region');
    const gameValue = formData.get('game');
    console.log('Creating lobby with game:', gameValue);
    
    const lobbyData = {
        name: formData.get('name'),
        game: formData.get('game'),
        gameType: formData.get('game').toLowerCase(), // Use lowercase value for consistency
        maxPlayers: parseInt(formData.get('maxPlayers')) || 5,
        currentPlayers: 1, // Start with the host
        region: regionValue, // This is already the correct code (na, eu, asia, etc.)
        language: formData.get('language'),
        skillLevel: getRankLevel(formData.get('minRank')),
        rank: formData.get('minRank'),
        description: formData.get('description') || '',
        requirements: {
            micRequired: formData.get('micRequired') === 'on',
            ageRestricted: formData.get('18plus') === 'on',
            casualFriendly: formData.get('casual') === 'on',
            competitiveFocus: formData.get('competitive') === 'on'
        },
        schedule: formData.get('schedule') || '',
        discord: formData.get('discord') || '',
        status: 'waiting',
        createdAt: new Date().toISOString()
    };
    
    // Log the key data for debugging
    console.log('Creating lobby with key data:', {
        name: lobbyData.name,
        game: lobbyData.game,
        region: lobbyData.region,  // Should be the code like "na", "eu", "asia"
        rank: lobbyData.rank,
        skillLevel: lobbyData.skillLevel
    });
    
    // Add host ID if available
    if (userInfo && userInfo._id) {
        lobbyData.host = userInfo._id;
        // Also add full host info for display purposes
        lobbyData.hostInfo = {
            _id: userInfo._id,
            username: userInfo.username || userInfo.email.split('@')[0],
            email: userInfo.email
        };
    }
    
    console.log('Creating lobby with data:', lobbyData);
    console.log('Game image would be:', GAME_IMAGES[lobbyData.gameType.toLowerCase()] || GAME_IMAGES.default);
    
    try {
        // Determine the API URL
        const baseApiUrl = window.APP_CONFIG && window.APP_CONFIG.API_URL 
            ? window.APP_CONFIG.API_URL
            : '/api';
            
        const apiUrl = `${window.location.origin}${baseApiUrl}/lobbies`;
            
        console.log('Using API URL:', apiUrl);
        
        // Add additional debug data for League of Legends
        if (lobbyData.game === 'lol') {
            console.log('Creating League of Legends lobby with data:', {
                game: lobbyData.game,
                gameType: lobbyData.gameType,
                image: GAME_IMAGES[lobbyData.game]
            });
        }
        
        // Send API request to create lobby with proper authorization
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
            },
            body: JSON.stringify(lobbyData)
        });
        
        console.log('Response status:', response.status);
        
        // Get the response data
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Error parsing response:', e);
            data = { message: responseText };
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized specifically
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                throw new Error('Your session has expired. Please log in again.');
            } else {
                throw new Error(data.error || data.message || `Server error (${response.status})`);
            }
        }
        
        console.log('Lobby created successfully:', data);
        
        // For demo/development purposes, if we can't connect to the API, store locally
        if (!data || !data._id) {
            console.log('Using local storage fallback for lobbies');
            
            // Get existing lobbies or create empty array
            const existingLobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
            
            // Create a dummy ID
            lobbyData._id = 'local_' + Date.now();
            
            // Add host details if missing
            if (!lobbyData.host) {
                lobbyData.host = 'current_user';
                lobbyData.hostInfo = {
                    _id: 'current_user',
                    username: userInfo ? userInfo.username || 'You' : 'You',
                    email: userInfo ? userInfo.email : 'you@example.com'
                };
            }
            
            // Log the final lobby data before saving
            console.log('Final lobby data being saved to localStorage:', JSON.stringify(lobbyData));
            
            // Add to existing lobbies
            existingLobbies.push(lobbyData);
            
            // Save back to localStorage
            localStorage.setItem('lobbies', JSON.stringify(existingLobbies));
            
            data = lobbyData;
        }
        
        // Show success notification
        showNotification('Lobby created successfully!', 'success');
        
        // Redirect to the lobbies page on success
        setTimeout(() => {
            window.location.href = 'lobbies.html';
        }, 1500);
    } catch (error) {
        console.error('Error creating lobby:', error);
        
        // Reset button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Create Lobby';
        }
        
        // Display error message
        showLoginError(error.message || 'Failed to create lobby. Please try again.');
        showNotification(error.message || 'Failed to create lobby', 'error');
    }
}

// Helper function to convert rank to numeric skill level
function getRankLevel(rank) {
    if (!rank || rank === 'any') return 3; // Default to middle
    
    // Handle common rank patterns
    const rankLower = typeof rank === 'string' ? rank.toLowerCase() : '';
    
    if (rankLower.includes('iron') || rankLower.includes('bronze') || 
        rankLower.includes('rookie') || rankLower.includes('silver1') || 
        rankLower.includes('beginner')) {
        return 1;
    }
    
    if (rankLower.includes('silver') || rankLower.includes('gold') || 
        rankLower.includes('intermediate')) {
        return 2;
    }
    
    if (rankLower.includes('platinum') || rankLower.includes('diamond') || 
        rankLower.includes('advanced')) {
        return 3;
    }
    
    if (rankLower.includes('master') || rankLower.includes('immortal') || 
        rankLower.includes('ascendant') || rankLower.includes('expert')) {
        return 4;
    }
    
    if (rankLower.includes('radiant') || rankLower.includes('challenger') || 
        rankLower.includes('global') || rankLower.includes('predator')) {
        return 5;
    }
    
    return 3; // Default to middle
}

// Helper function to determine game type based on game
function getGameType(game) {
    if (!game) return 'FPS';
    
    const gameLower = game.toLowerCase();
    
    // FPS games
    if (gameLower.includes('valorant') || 
        gameLower.includes('cs') || 
        gameLower.includes('counter') || 
        gameLower.includes('overwatch') || 
        gameLower.includes('rainbow') ||
        gameLower.includes('call of duty') ||
        gameLower.includes('cod') ||
        gameLower.includes('pubg')) {
        return 'FPS';
    }
    
    // MOBA games
    if (gameLower.includes('lol') || 
        gameLower.includes('league') || 
        gameLower.includes('dota') || 
        gameLower.includes('heroes of')) {
        return 'MOBA';
    }
    
    // Battle Royale games
    if (gameLower.includes('apex') || 
        gameLower.includes('fortnite') || 
        gameLower.includes('warzone') || 
        gameLower.includes('battle royale')) {
        return 'Battle Royale';
    }
    
    // RPG games
    if (gameLower.includes('rpg') || 
        gameLower.includes('world of warcraft') || 
        gameLower.includes('wow') || 
        gameLower.includes('elder scrolls') ||
        gameLower.includes('final fantasy')) {
        return 'RPG';
    }
    
    // Default to FPS
    return 'FPS';
}

/**
 * Get user info from localStorage
 */
function getUserInfo() {
    try {
        const userInfo = localStorage.getItem('userInfo');
        
        if (userInfo) {
            return JSON.parse(userInfo);
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing user info from localStorage:', error);
        return null;
    }
}

/**
 * Show login error
 */
function showLoginError(message) {
    const errorElement = document.getElementById('form-error');
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        
        // Scroll to error
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        // Fallback to alert if error element not found
        alert(message);
    }
}
