// JavaScript for Create Lobby functionality

// Wait for configuration to be loaded
if (!window.APP_CONFIG) {
    console.error('Configuration not loaded. Please make sure config.js is loaded first.');
}

document.addEventListener('DOMContentLoaded', function() {
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

        if (gameSelect && minRankSelect) {
            gameSelect.addEventListener('change', () => {
                updateRankOptions(gameSelect.value, minRankSelect);
            });
        }
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
 * Show notification message
 */
function showNotification(message, type = 'error') {
    const container = document.querySelector('.notifications-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Handle lobby creation form submission
 */
async function handleLobbyCreation(e) {
    e.preventDefault();
    
    const formError = document.getElementById('form-error');
    formError.textContent = '';
    formError.classList.add('hidden');
    
    // Check authentication - using the correct token key
    const token = localStorage.getItem('token');
    if (!token) {
        // Store the current URL before redirecting
        localStorage.setItem('returnUrl', window.location.href);
        window.location.href = 'login.html';
        return;
    }
    
    // Get form data
    const formData = new FormData(e.target);
    const lobbyData = {
        name: formData.get('name'),
        gameType: formData.get('game'),
        maxPlayers: parseInt(formData.get('maxPlayers')),
        region: formData.get('region'),
        language: formData.get('language'),
        rank: formData.get('minRank'),
        requirements: {
            micRequired: formData.get('micRequired') === 'on',
            ageRestricted: formData.get('18plus') === 'on',
            casualFriendly: formData.get('casual') === 'on',
            competitiveFocus: formData.get('competitive') === 'on'
        },
        schedule: formData.get('schedule') || null,
        discord: formData.get('discord') || null,
        status: 'open'
    };
    
    try {
        console.log('Creating lobby with data:', lobbyData);
        console.log('Using API URL:', window.APP_CONFIG.API_URL);
        
        // Send API request to create lobby
        const response = await fetch(`${window.APP_CONFIG.API_URL}/lobbies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(lobbyData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to create lobby');
        }
        
        // Show success notification
        showNotification('Lobby created successfully!', 'success');
        
        // Redirect to the lobbies page on success
        setTimeout(() => {
            window.location.href = 'lobbies.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating lobby:', error);
        // Display error message
        formError.textContent = error.message;
        formError.classList.remove('hidden');
        showNotification(error.message, 'error');
    }
}
