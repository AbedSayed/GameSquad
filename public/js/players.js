// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

if (!window.APP_CONFIG?.API_URL) {
    console.error('APP_CONFIG.API_URL is not defined. Make sure config.js is loaded first.');
}

// Set default values for pagination
window.APP_CONFIG.PLAYERS_PER_PAGE = window.APP_CONFIG.PLAYERS_PER_PAGE || 12;

// DOM Elements
const playersContainer = document.getElementById('playersContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const sortSelect = document.getElementById('sortSelect');
const loadingSpinner = document.getElementById('loadingSpinner');
const noPlayersMessage = document.getElementById('noPlayersMessage');
const resetFiltersBtn = document.getElementById('resetFilters');
const toggleFiltersBtn = document.getElementById('toggleFilters');
const userProfileNav = document.querySelector('.user-profile');
const usernameSpan = document.querySelector('.username');
const filtersForm = document.querySelector('.filters-form');

// State
let players = [];
let filteredPlayers = [];
let currentPage = 1;
let currentUser = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('Players page loaded - DOM is ready');
    // First setup the event listeners
    setupEventListeners();
    
    // Then load the players data
    setTimeout(() => {
        loadPlayers();
    }, 100); // Small delay to ensure everything is ready
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Toggle filters button
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    if (toggleFiltersBtn) {
        console.log('Toggle filters button found');
        toggleFiltersBtn.addEventListener('click', function() {
            const filtersForm = document.querySelector('.filters-form');
            if (filtersForm) {
                const isVisible = filtersForm.style.display !== 'none';
                filtersForm.style.display = isVisible ? 'none' : 'block';
                const btnText = toggleFiltersBtn.querySelector('span');
                if (btnText) {
                    btnText.textContent = isVisible ? 'Show Filters' : 'Hide Filters';
                } else {
                    this.textContent = isVisible ? 'Show Filters' : 'Hide Filters';
                }
            }
        });
    } else {
        console.error('Toggle filters button not found!');
    }
    
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        console.log('Search button found');
        searchBtn.addEventListener('click', filterPlayers);
    }
    
    // Reset filters button
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        console.log('Reset filters button found');
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Search input (for typing)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        console.log('Search input found');
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                filterPlayers();
            }
        });
    }
    
    console.log('Event listeners setup complete');
}

// Generate mock player data for testing purposes
function generateMockPlayers() {
    console.log('Generating mock player data');
    
    const games = ['Valorant', 'CS:GO', 'League of Legends', 'Apex Legends', 'Fortnite'];
    const regions = ['EU', 'NA', 'Asia', 'Oceania'];
    const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    
    const mockPlayers = [];
    
    // Generate 8 mock players
    for (let i = 1; i <= 8; i++) {
        const username = `player${i}`;
        const randomGame = games[Math.floor(Math.random() * games.length)];
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];
        const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
        const level = Math.floor(Math.random() * 100) + 1;
        const gamesPlayed = Math.floor(Math.random() * 500) + 10;
        
        mockPlayers.push({
            _id: `mock_${i}`,
            username: username,
            profile: {
                displayName: `${randomGame} Player ${i}`,
                level: level,
                gamesPlayed: gamesPlayed,
                bio: `I'm a ${randomRank} ${randomGame} player from ${randomRegion}. Looking for teammates!`,
                favoriteGame: randomGame,
                region: randomRegion,
                rank: randomRank
            },
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
        });
    }
    
    return mockPlayers;
}

async function loadPlayers() {
    try {
        console.log('Starting to load players...');
        showLoadingIndicator();
        
        // Get API URL from config
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        console.log('Using API URL:', apiUrl);
        
        // Get all users
        fetch(`${apiUrl}/users/all`)
            .then(response => {
                console.log('Received response:', response.status);
                if (!response.ok) {
                    throw new Error(`Failed to fetch players: ${response.status}`);
                }
                return response.json();
            })
            .then(players => {
                console.log('Players loaded:', players);
                if (!players || !Array.isArray(players)) {
                    console.error('Invalid players data received:', players);
                    showErrorMessage('Failed to load players: Invalid data format');
                    
                    // Fall back to mock data
                    displayPlayers(generateMockPlayers());
                    return;
                }
                
                if (players.length === 0) {
                    console.log('No players found in the database');
                    // Show a message in the UI
                    const noPlayersMessage = document.getElementById('noPlayersMessage');
                    if (noPlayersMessage) {
                        noPlayersMessage.classList.remove('d-none');
                    }
                    
                    // Fall back to mock data
                    displayPlayers(generateMockPlayers());
                    return;
                }
                
                // Filter out the current user
                const currentUser = getCurrentUser();
                console.log('Current user:', currentUser);
                
                const filteredPlayers = currentUser ? 
                    players.filter(player => player._id !== currentUser._id) : 
                    players;
                
                console.log('Filtered players (excluding current user):', filteredPlayers);
                
                if (filteredPlayers.length === 0) {
                    // If no players after filtering, use mock data
                    displayPlayers(generateMockPlayers());
                } else {
                    displayPlayers(filteredPlayers);
                }
                
                hideLoadingIndicator();
            })
            .catch(error => {
                console.error('Error loading players:', error);
                showErrorMessage('Failed to load players. Using demo data instead.');
                hideLoadingIndicator();
                
                // Use mock data for demo purposes
                displayPlayers(generateMockPlayers());
            });
    } catch (error) {
        console.error('Error in loadPlayers function:', error);
        showErrorMessage('An error occurred while loading players. Using demo data instead.');
        hideLoadingIndicator();
        
        // Use mock data for demo purposes
        displayPlayers(generateMockPlayers());
    }
}

function displayPlayers(players) {
    const playersContainer = document.getElementById('playersContainer');
    
    if (!playersContainer) {
        console.error('Players container not found! Element with ID "playersContainer" is missing.');
        return;
    }
    
    playersContainer.innerHTML = '';
    
    if (!players || players.length === 0) {
        playersContainer.innerHTML = '<p class="no-players">No players found</p>';
        return;
    }
    
    console.log(`Displaying ${players.length} players`);
    
    players.forEach(player => {
        const playerCard = createPlayerCard(player);
        playersContainer.appendChild(playerCard);
    });
}

function createPlayerCard(player) {
    console.log('Creating player card for:', player);
    
    const card = document.createElement('div');
    card.className = 'player-card glow-effect';
    card.setAttribute('data-player-id', player._id);
    
    // Extract profile data safely
    const profile = player.profile || {};
    const username = player.username || 'Unknown Player';
    const displayName = profile.displayName || username;
    
    // Use default values if properties are missing
    const avatar = profile.avatar || 'default-avatar.png';
    const level = profile.level || 1;
    
    // For demo purposes, if no avatar, use initials
    let avatarHtml;
    if (avatar === 'default-avatar.png') {
        const initials = username.slice(0, 2).toUpperCase();
        avatarHtml = `<div class="player-avatar">${initials}</div>`;
    } else {
        avatarHtml = `<img src="/images/avatars/${avatar}" alt="${displayName}'s avatar" class="player-avatar">`;
    }
    
    // Check friend status
    const friendStatus = checkIfFriend(player._id);
    let friendBtnHtml = '';
    
    if (friendStatus === 'friend') {
        // Already friends
        friendBtnHtml = `<button class="btn btn-secondary" data-id="${player._id}">
            <i class="fas fa-check"></i> Friend
        </button>`;
    } else if (friendStatus === 'pending') {
        // Request pending
        friendBtnHtml = `<button class="btn btn-secondary" data-id="${player._id}">
            <i class="fas fa-clock"></i> Pending
        </button>`;
    } else {
        // Not friends yet
        friendBtnHtml = `<button class="btn btn-secondary add-friend-btn" data-id="${player._id}">
            <i class="fas fa-user-plus"></i> Add
        </button>`;
    }
    
    card.innerHTML = `
        <div class="player-header">
            <div class="player-info">
                ${avatarHtml}
                <div class="player-name">${displayName}</div>
            </div>
        </div>
        <div class="player-body">
            <div class="info-item">
                <i class="fas fa-user"></i>
                <span>@${username}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-trophy"></i>
                <span>Level ${level}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-gamepad"></i>
                <span>Games: ${profile.gamesPlayed || 0}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Joined: ${formatJoinDate(player.createdAt)}</span>
            </div>
            <div class="player-bio">
                <p>${profile.bio || 'No bio available'}</p>
            </div>
            <div class="player-actions">
                <button class="btn btn-primary view-profile-btn" data-id="${player._id}">
                    <i class="fas fa-user"></i> Profile
                </button>
                ${friendBtnHtml}
                <button class="btn btn-primary invite-lobby-btn" data-id="${player._id}">
                    <i class="fas fa-gamepad"></i> Invite
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const viewProfileBtn = card.querySelector('.view-profile-btn');
    viewProfileBtn.addEventListener('click', () => {
        window.location.href = `/profile.html?id=${player._id}`;
    });
    
    const addFriendBtn = card.querySelector('.add-friend-btn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', () => {
            addFriend(player._id, username);
        });
    }
    
    const inviteLobbyBtn = card.querySelector('.invite-lobby-btn');
    inviteLobbyBtn.addEventListener('click', () => {
        inviteToLobby(player._id, displayName);
    });
    
    return card;
}

// Helper function to format join date
function formatJoinDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Unknown';
    }
}

// Add friend function - now sends a friend request instead of directly adding
async function addFriend(playerId, playerName) {
    if (!isLoggedIn()) {
        showNotification('Please log in to send friend requests', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        // Use the correct endpoint that exists on the server
        const response = await fetch(`/api/users/friends/add/${playerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update the button to show added friend
            const addFriendBtn = document.querySelector(`.add-friend-btn[data-id="${playerId}"]`);
            if (addFriendBtn) {
                addFriendBtn.className = 'btn friend-added';
                addFriendBtn.style.backgroundColor = '#28a745'; // Green for added
                addFriendBtn.innerHTML = '<i class="fas fa-check"></i> Friend';
                addFriendBtn.style.cursor = 'default';
                // Remove click event listeners
                const newBtn = addFriendBtn.cloneNode(true);
                addFriendBtn.parentNode.replaceChild(newBtn, addFriendBtn);
            }
            
            showNotification(`Added ${playerName} as a friend!`, 'success');
            
            // Update local storage to reflect the new friend
            try {
                const userInfo = getCurrentUser();
                if (userInfo && userInfo.friends) {
                    // Add the new friend ID if it's not already in the list
                    if (!userInfo.friends.includes(playerId)) {
                        userInfo.friends.push(playerId);
                        localStorage.setItem('userInfo', JSON.stringify(userInfo));
                    }
                }
            } catch (err) {
                console.error('Error updating local user info:', err);
            }
        } else {
            showNotification(data.message || 'Failed to add friend', 'error');
        }
    } catch (error) {
        console.error('Error adding friend:', error);
        showNotification('Failed to add friend. Please try again later.', 'error');
    }
}

// Helper to check if a player is already a friend or has a pending request
function checkIfFriend(playerId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return false;
        
        // Check if they're already friends - check the friends array directly
        if (currentUser.friends && Array.isArray(currentUser.friends)) {
            // Friends might be stored as strings or objects with _id
            const isFriend = currentUser.friends.some(friend => {
                if (typeof friend === 'string') {
                    return friend === playerId;
                } else if (friend && friend._id) {
                    return friend._id === playerId;
                }
                return false;
            });
            
            if (isFriend) {
                return 'friend';
            }
        }
        
        // This app might not have friend requests feature implemented,
        // so skip this check if the structure doesn't exist
        if (currentUser.friendRequests) {
            // Check if there's a pending friend request
            if (currentUser.friendRequests.sent && 
                currentUser.friendRequests.sent.some(request => {
                    if (typeof request.recipient === 'string') {
                        return request.recipient === playerId;
                    } else if (request.recipient && request.recipient._id) {
                        return request.recipient._id === playerId;
                    }
                    return false;
                })) {
                return 'pending';
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking friend status:', error);
        return false;
    }
}

// Invite to lobby function
function inviteToLobby(playerId, playerName) {
    // Check if user is logged in
    if (!isLoggedIn()) {
        showNotification('Please log in to invite players to lobbies', 'error');
        return;
    }
    
    // Get current user info
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showNotification('Failed to get current user information', 'error');
        return;
    }
    
    // Check if user has an active lobby
    const activeLobbies = getUserActiveLobbies();
    
    if (!activeLobbies || activeLobbies.length === 0) {
        showNotification('You must create or join a lobby before inviting players', 'info');
        return;
    }
    
    // If user has multiple lobbies, we could show a dropdown to select which one to invite to
    // For now, just use the first active lobby
    const lobby = activeLobbies[0];
    
    // Generate a unique invite ID
    const inviteId = 'inv_' + Math.random().toString(36).substring(2, 15);
    
    // Create the invite object
    const invite = {
        id: inviteId,
        senderId: currentUser._id,
        senderName: currentUser.username,
        recipientId: playerId,
        recipientName: playerName,
        type: 'lobby_invite',
        lobbyId: lobby._id,
        lobbyName: lobby.name,
        gameType: lobby.gameType || 'Unknown',
        message: `${currentUser.username} has invited you to join their lobby!`,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    // Store the invite in localStorage
    let existingInvites = localStorage.getItem('lobby_invites');
    let invites = [];
    
    if (existingInvites) {
        try {
            invites = JSON.parse(existingInvites);
        } catch (e) {
            console.error('Error parsing existing invites:', e);
        }
    }
    
    // Add new invite to the array
    invites.push(invite);
    
    // Save back to localStorage
    localStorage.setItem('lobby_invites', JSON.stringify(invites));
    
    // Show success notification
    showNotification(`Invitation sent to ${playerName}`, 'success');
    
    // In a real application, we would also send this to the server
    // to be stored in the database and potentially trigger a real-time notification
    try {
        // Send invite to the server (if API is available)
        fetch(`${window.APP_CONFIG.API_URL}/invites/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(invite)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send invite through API');
            }
            return response.json();
        })
        .then(data => {
            console.log('Invite sent through API:', data);
        })
        .catch(error => {
            console.error('API invite error:', error);
            // We already saved to localStorage so no need to show an error
        });
    } catch (error) {
        console.warn('Error sending invite to server:', error);
        // Invite is already saved locally, so this is just a warning
    }
}

// Helper function to get user's active lobbies
function getUserActiveLobbies() {
    // In a real application, this would fetch from the server
    // For demo purposes, we'll create a mock lobby
    
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    // Check if we have stored lobbies in localStorage
    let storedLobbies = localStorage.getItem('user_lobbies');
    let lobbies = [];
    
    if (storedLobbies) {
        try {
            lobbies = JSON.parse(storedLobbies);
            // Filter to only include lobbies where this user is the host
            lobbies = lobbies.filter(lobby => lobby.host._id === currentUser._id);
        } catch (e) {
            console.error('Error parsing stored lobbies:', e);
        }
    }
    
    // If no lobbies found, create a mock one
    if (lobbies.length === 0) {
        const mockLobby = {
            _id: 'lobby_' + Math.random().toString(36).substring(2, 15),
            name: `${currentUser.username}'s Lobby`,
            host: {
                _id: currentUser._id,
                username: currentUser.username
            },
            gameType: 'FPS',
            maxPlayers: 5,
            currentPlayers: 1,
            status: 'waiting',
            createdAt: new Date().toISOString()
        };
        
        lobbies.push(mockLobby);
        
        // Save back to localStorage
        localStorage.setItem('user_lobbies', JSON.stringify(lobbies));
    }
    
    return lobbies;
}

function viewProfile(playerId) {
    window.location.href = `/profile.html?id=${playerId}`;
}

function filterPlayers() {
    // Get search input from either element ID
    let searchTerm = '';
    const playerSearch = document.getElementById('player-search');
    const searchInput = document.getElementById('searchInput');
    
    if (playerSearch) {
        searchTerm = playerSearch.value.toLowerCase();
    } else if (searchInput) {
        searchTerm = searchInput.value.toLowerCase();
    }
    
    // Get filter values if they exist
    let gameFilter = '';
    const gameFilterElem = document.getElementById('game-filter');
    if (gameFilterElem) {
        gameFilter = gameFilterElem.value;
    }
    
    let rankFilter = '';
    const rankFilterElem = document.getElementById('rank-filter');
    if (rankFilterElem) {
        rankFilter = rankFilterElem.value;
    }
    
    // Apply filters to player cards
    const playerCards = document.querySelectorAll('.player-card');
    if (playerCards.length === 0) {
        return; // No cards to filter
    }
    
    let cardsVisible = 0;
    
    playerCards.forEach(card => {
        const playerNameElem = card.querySelector('.player-name');
        if (!playerNameElem) return;
        
        const playerName = playerNameElem.textContent.toLowerCase();
        
        // Apply filters
        let matchesSearch = !searchTerm || playerName.includes(searchTerm);
        let matchesGame = !gameFilter || card.getAttribute('data-game') === gameFilter || gameFilter === '';
        let matchesRank = !rankFilter || card.getAttribute('data-rank') === rankFilter || rankFilter === '';
        
        // Show/hide based on filter results
        if (matchesSearch && matchesGame && matchesRank) {
            card.style.display = '';
            cardsVisible++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide no results message
    const noPlayersMessage = document.getElementById('noPlayersMessage');
    if (noPlayersMessage) {
        if (cardsVisible === 0) {
            noPlayersMessage.classList.remove('d-none');
        } else {
            noPlayersMessage.classList.add('d-none');
        }
    }
}

function resetFilters() {
    // Reset search input
    const playerSearch = document.getElementById('player-search');
    if (playerSearch) {
        playerSearch.value = '';
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Reset game filter
    const gameFilter = document.getElementById('game-filter');
    if (gameFilter) {
        gameFilter.value = '';
    }
    
    // Reset rank filter
    const rankFilter = document.getElementById('rank-filter');
    if (rankFilter) {
        rankFilter.value = '';
    }
    
    // Show all players
    const playerCards = document.querySelectorAll('.player-card');
    playerCards.forEach(card => {
        card.style.display = '';
    });
    
    // Hide no players message
    const noPlayersMessage = document.getElementById('noPlayersMessage');
    if (noPlayersMessage) {
        noPlayersMessage.classList.add('d-none');
    }
}

function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingSpinner');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('d-none');
    } else {
        console.error('Loading spinner element not found!');
    }
    
    // Hide any error messages
    const noPlayersMessage = document.getElementById('noPlayersMessage');
    if (noPlayersMessage) {
        noPlayersMessage.classList.add('d-none');
    }
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingSpinner');
    if (loadingIndicator) {
        loadingIndicator.classList.add('d-none');
    }
}

function showErrorMessage(message) {
    console.error('Error:', message);
    
    // Display error in UI
    const noPlayersMessage = document.getElementById('noPlayersMessage');
    if (noPlayersMessage) {
        noPlayersMessage.textContent = message;
        noPlayersMessage.classList.remove('d-none');
    } else {
        // If element doesn't exist, create one
        const playersContainer = document.getElementById('playersContainer');
        if (playersContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = message;
            
            // Clear container first
            playersContainer.innerHTML = '';
            playersContainer.appendChild(errorDiv);
        }
    }
    
    // Also show as notification
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    }
    
    // Hide loading spinner
    hideLoadingIndicator();
}

// Modified showNotification to allow for persistent notifications
function showNotification(message, type = 'info', autoHide = true) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds if autoHide is true
    if (autoHide) {
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    return notification;
}

// Helper function to get current user info from localStorage
function getCurrentUser() {
    try {
        const userInfoString = localStorage.getItem('userInfo');
        if (!userInfoString) {
            return null;
        }
        return JSON.parse(userInfoString);
    } catch (error) {
        console.error('Error parsing user info from localStorage:', error);
        return null;
    }
}

// Helper function to check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}