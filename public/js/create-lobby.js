
if (!window.APP_CONFIG) {
    console.error('Configuration not loaded. Please make sure config.js is loaded first.');
}

const GAME_IMAGES = {
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('Create lobby page loaded');

    if (typeof window.Auth !== 'undefined' && typeof window.Auth.isLoggedIn === 'function') {
        if (!window.Auth.isLoggedIn()) {
            localStorage.setItem('returnUrl', window.location.href);
            window.location.href = 'login.html';
            return;
        }
    } else {
        const token = localStorage.getItem('token');
        if (!token) {
            localStorage.setItem('returnUrl', window.location.href);
            window.location.href = 'login.html';
            return;
        }
    }

    const createLobbyForm = document.getElementById('create-lobby-form');
    const formError = document.getElementById('form-error');

    if (createLobbyForm) {
        createLobbyForm.addEventListener('submit', handleLobbyCreation);

        const gameSelect = document.getElementById('game');
        const minRankSelect = document.getElementById('min-rank');
        const regionSelect = document.getElementById('region');
        const languageSelect = document.getElementById('language');

        if (gameSelect && minRankSelect) {
            gameSelect.addEventListener('change', () => {
                updateRankOptions(gameSelect.value, minRankSelect);
            });
            
            gameSelect.addEventListener('change', updatePreview);
            minRankSelect.addEventListener('change', updatePreview);
            regionSelect.addEventListener('change', updatePreview);
            languageSelect.addEventListener('change', updatePreview);
            
            updatePreview();
        }
    }

    const lobbyNameInput = document.getElementById('name');
    const gameSelect = document.getElementById('game');
    const regionSelect = document.getElementById('region');
    const languageSelect = document.getElementById('language');
    const maxPlayersSelect = document.getElementById('max-players');
    const minRankSelect = document.getElementById('min-rank');
    
    const previewName = document.getElementById('preview-name');
    const previewImage = document.getElementById('preview-image');
    const regionPreview = document.getElementById('region-preview');
    const languagePreview = document.getElementById('language-preview');
    const gameBadge = document.querySelector('.game-badge');
    
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
    
    const gameBadgeClassMap = {
        'FPS': 'fps',
        'MOBA': 'moba',
        'Battle Royale': 'battle-royale',
        'RPG': 'rpg',
        'Sports': 'sports'
    };
    
    lobbyNameInput.addEventListener('input', function() {
        previewName.textContent = this.value || 'Your Lobby Name';
    });
    
    gameSelect.addEventListener('change', function() {
        const gameValue = this.value;
        const gameType = gameTypeMap[gameValue] || 'Game';
        
        gameBadge.textContent = gameType;
        
        Object.values(gameBadgeClassMap).forEach(cls => {
            gameBadge.classList.remove(cls);
        });
        
        const badgeClass = gameBadgeClassMap[gameType] || 'fps';
        gameBadge.classList.add(badgeClass);
        
        previewImage.src = GAME_IMAGES[gameValue] || GAME_IMAGES.default;
        previewImage.alt = this.options[this.selectedIndex].text;
    });
    
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
    
    languageSelect.addEventListener('change', function() {
        languagePreview.textContent = this.options[this.selectedIndex].text;
    });
    
    minRankSelect.addEventListener('change', function() {
        const skillLevel = document.querySelector('.skill-level');
        const rankValue = this.value;
        
        skillLevel.innerHTML = '';
        
        let level = 3;
        
        if (rankValue === 'beginner') level = 1;
        else if (rankValue === 'intermediate') level = 2;
        else if (rankValue === 'advanced') level = 4;
        else if (rankValue === 'expert') level = 5;
        
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('span');
            dot.className = 'skill-level-dot' + (i < level ? ' active' : '');
            skillLevel.appendChild(dot);
        }
    });
    
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

    function populateRanks(game) {
        const rankSelect = document.getElementById('min-rank');
        rankSelect.innerHTML = '<option value="any">Any Rank</option>';
        
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
        
        ranks.forEach(rank => {
            const option = document.createElement('option');
            option.value = rank.toLowerCase().replace(' ', '_');
            option.textContent = rank;
            rankSelect.appendChild(option);
        });
    }
    
    gameSelect.addEventListener('change', function() {
        populateRanks(this.value);
    });
    
    populateRanks('');
    
    document.getElementById('create-lobby-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        showNotification('Lobby created successfully! Redirecting to your lobby...', 'success');
        
        setTimeout(() => {
            window.location.href = 'lobbies.html';
        }, 2000);
    });
    
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

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    initializeRanks();
    
    initializeForm();
    
    initializePreview();
    
    const urlParams = new URLSearchParams(window.location.search);
    const gameParam = urlParams.get('game');
    
    if (gameParam) {
        console.log(`Game parameter detected in URL: ${gameParam}`);
        const gameSelect = document.getElementById('game');
        
        for (const option of gameSelect.options) {
            if (option.value.toLowerCase() === gameParam.toLowerCase()) {
                gameSelect.value = option.value;
                gameSelect.dispatchEvent(new Event('change'));
                console.log(`Pre-selected game: ${option.value}`);
                break;
            }
        }
    }
});

/**
 * Update rank options based on selected game
 */
function updateRankOptions(game, rankSelect) {
    rankSelect.innerHTML = '<option value="any">Any Rank</option>';
    
    let ranks = [
        { value: 'bronze', label: 'Bronze' },
        { value: 'silver', label: 'Silver' },
        { value: 'gold', label: 'Gold' },
        { value: 'platinum', label: 'Platinum' },
        { value: 'diamond', label: 'Diamond' }
    ];
    
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
    
    if (gameSelect && previewImage) {
        const gameValue = gameSelect.value;
        if (gameValue) {
            previewImage.src = GAME_IMAGES[gameValue] || GAME_IMAGES.default;
            previewImage.alt = gameSelect.options[gameSelect.selectedIndex].text;
            
            if (gameBadge) {
                const gameType = gameTypeMap[gameValue] || 'Game';
                gameBadge.textContent = gameType;
            }
        } else {
            previewImage.src = GAME_IMAGES.default;
            previewImage.alt = "Game";
            
            if (gameBadge) {
                gameBadge.textContent = "Game";
            }
        }
    }
    
    const rankPreview = document.getElementById('rank-preview');
    if (rankPreview && minRankSelect) {
        const rankOption = minRankSelect.options[minRankSelect.selectedIndex];
        rankPreview.textContent = `Rank: ${rankOption.textContent}`;
    }
    
    const regionPreview = document.getElementById('region-preview');
    if (regionPreview && regionSelect) {
        const regionOption = regionSelect.options[regionSelect.selectedIndex];
        regionPreview.textContent = `Region: ${regionOption.textContent}`;
    }
    
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
    
    const userInfo = getUserInfo();
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    console.log('Current user:', userInfo);
    console.log('Token available:', !!token);
    
    if (!token) {
        showLoginError('You must be logged in to create a lobby');
        
        localStorage.setItem('returnUrl', window.location.href);
        
        showNotification('Authentication required. Please log in.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
    
    const formData = new FormData(e.target);
    
    const regionValue = formData.get('region');
    const gameValue = formData.get('game');
    console.log('Creating lobby with game:', gameValue);
    
    const lobbyData = {
        name: formData.get('name'),
        game: formData.get('game'),
        gameType: formData.get('game').toLowerCase(),
        maxPlayers: parseInt(formData.get('maxPlayers')) || 5,
        currentPlayers: 1,
        region: regionValue,
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
    
    console.log('Creating lobby with key data:', {
        name: lobbyData.name,
        game: lobbyData.game,
        region: lobbyData.region,
        rank: lobbyData.rank,
        skillLevel: lobbyData.skillLevel,
        description: lobbyData.description
    });
    
    if (userInfo && userInfo._id) {
        lobbyData.host = userInfo._id;
        lobbyData.hostInfo = {
            _id: userInfo._id,
            username: userInfo.username || userInfo.email.split('@')[0],
            email: userInfo.email
        };
    }
    
    console.log('Creating lobby with data:', lobbyData);
    console.log('Game image would be:', GAME_IMAGES[lobbyData.gameType.toLowerCase()] || GAME_IMAGES.default);
    
    try {
        const baseApiUrl = window.APP_CONFIG && window.APP_CONFIG.API_URL
            ? window.APP_CONFIG.API_URL
            : '/api';
            
        const apiUrl = `${window.location.origin}${baseApiUrl}/lobbies`;
            
        console.log('Using API URL:', apiUrl);
        
        if (lobbyData.game === 'lol') {
            console.log('Creating League of Legends lobby with data:', {
                game: lobbyData.game,
                gameType: lobbyData.gameType,
                image: GAME_IMAGES[lobbyData.game]
            });
        }
        
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
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                throw new Error('Your session has expired. Please log in again.');
            } else {
                throw new Error(data.error || data.message || `Server error (${response.status})`);
            }
        }
        
        console.log('Lobby created successfully:', data);
        
        if (!data || !data._id) {
            console.log('Using local storage fallback for lobbies');
            
            const existingLobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
            
            lobbyData._id = 'local_' + Date.now();
            
            if (!lobbyData.host) {
                lobbyData.host = 'current_user';
                lobbyData.hostInfo = {
                    _id: 'current_user',
                    username: userInfo ? userInfo.username || 'You' : 'You',
                    email: userInfo ? userInfo.email : 'you@example.com'
                };
            }
            
            console.log('Final lobby data being saved to localStorage:', JSON.stringify(lobbyData));
            
            existingLobbies.push(lobbyData);
            
            localStorage.setItem('lobbies', JSON.stringify(existingLobbies));
            
            data = lobbyData;
        }
        
        showNotification('Lobby created successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'lobbies.html';
        }, 1500);
    } catch (error) {
        console.error('Error creating lobby:', error);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Create Lobby';
        }
        
        showLoginError(error.message || 'Failed to create lobby. Please try again.');
        showNotification(error.message || 'Failed to create lobby', 'error');
    }
}

function getRankLevel(rank) {
    if (!rank || rank === 'any') return 3;
    

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
    
    return 3;
}

function getGameType(game) {
    if (!game) return 'FPS';
    
    const gameLower = game.toLowerCase();
    
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
    
    if (gameLower.includes('lol') ||
        gameLower.includes('league') || 
        gameLower.includes('dota') || 
        gameLower.includes('heroes of')) {
        return 'MOBA';
    }
    
    if (gameLower.includes('apex') ||
        gameLower.includes('fortnite') || 
        gameLower.includes('warzone') || 
        gameLower.includes('battle royale')) {
        return 'Battle Royale';
    }
    
    if (gameLower.includes('rpg') ||
        gameLower.includes('world of warcraft') || 
        gameLower.includes('wow') || 
        gameLower.includes('elder scrolls') ||
        gameLower.includes('final fantasy')) {
        return 'RPG';
    }
    
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
        
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        alert(message);
    }
}
