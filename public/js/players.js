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
    
    // Show loading notification
    showNotification('Loading lobbies...', 'info');
    
    // Directly fetch hosted lobbies from API
    fetch(`${window.APP_CONFIG.API_URL}/lobbies?host=${currentUser._id}`)
        .then(response => response.json())
        .then(response => {
            console.log('Hosted lobbies from API:', response);
            
            // Extract the lobbies array from the response
            const allLobbies = response.data || [];
            console.log('Lobbies array extracted:', allLobbies);
            
            // Filter for lobbies that the user is actually a host of or a member of
            const userLobbies = allLobbies.filter(lobby => {
                // Check if user is the host
                const isHost = lobby.host && lobby.host._id === currentUser._id;
                
                // Check if user is a player in this lobby
                const isPlayer = lobby.players && Array.isArray(lobby.players) && 
                    lobby.players.some(player => 
                        player.user && player.user._id === currentUser._id
                    );
                
                return isHost || isPlayer;
            });
            
            // Add isHost flag to each lobby
            const formattedLobbies = userLobbies.map(lobby => ({
                ...lobby,
                isHost: lobby.host && lobby.host._id === currentUser._id
            }));
            
            console.log('Filtered user lobbies:', formattedLobbies);
            
            if (!formattedLobbies || formattedLobbies.length === 0) {
                showNotification('You must join or create a lobby before inviting players', 'info');
                return;
            }
            
            // Show the popup with all lobbies
            showLobbySelectionPopup(formattedLobbies, playerId, playerName);
        })
        .catch(error => {
            console.error('Error fetching lobbies:', error);
            showNotification('Error loading lobbies. Please try again.', 'error');
        });
}

// Function to show the lobby selection popup
function showLobbySelectionPopup(lobbies, playerId, playerName) {
    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.className = 'modal-container';
    popupContainer.style.position = 'fixed';
    popupContainer.style.top = '0';
    popupContainer.style.left = '0';
    popupContainer.style.width = '100%';
    popupContainer.style.height = '100%';
    popupContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    popupContainer.style.display = 'flex';
    popupContainer.style.justifyContent = 'center';
    popupContainer.style.alignItems = 'center';
    popupContainer.style.zIndex = '9999';
    
    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.className = 'modal-content';
    popupContent.style.backgroundColor = 'rgba(26, 26, 36, 0.95)';
    popupContent.style.borderRadius = '8px';
    popupContent.style.boxShadow = '0 0 20px rgba(108, 92, 231, 0.4)';
    popupContent.style.width = '90%';
    popupContent.style.maxWidth = '500px';
    popupContent.style.maxHeight = '80vh';
    popupContent.style.overflow = 'auto';
    popupContent.style.border = '1px solid rgba(108, 92, 231, 0.3)';
    popupContent.style.backdropFilter = 'blur(10px)';
    
    // Create header
    const header = document.createElement('div');
    header.style.padding = '15px 20px';
    header.style.borderBottom = '1px solid rgba(108, 92, 231, 0.3)';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    // Create title
    const title = document.createElement('h2');
    title.textContent = `Invite ${playerName} to Lobby`;
    title.style.color = '#fff';
    title.style.margin = '0';
    title.style.fontSize = '1.5rem';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = '#fff';
    closeButton.style.fontSize = '1.5rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 5px';
    closeButton.style.lineHeight = '1';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(popupContainer);
    });
    
    // Add title and close button to header
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create body content
    const body = document.createElement('div');
    body.style.padding = '20px';
    
    // Create lobby list or empty state
            if (!lobbies || lobbies.length === 0) {
        // Empty state
        const emptyState = document.createElement('div');
        emptyState.style.textAlign = 'center';
        emptyState.style.padding = '30px 20px';
        
        const emptyIcon = document.createElement('div');
        emptyIcon.innerHTML = '<i class="fas fa-gamepad" style="font-size: 3rem; color: #6c5ce7; margin-bottom: 15px;"></i>';
        
        const emptyTitle = document.createElement('h3');
        emptyTitle.textContent = 'No Lobbies Available';
        emptyTitle.style.color = '#fff';
        emptyTitle.style.marginBottom = '10px';
        
        const emptyText = document.createElement('p');
        emptyText.textContent = 'You need to create or join a lobby before you can invite players.';
        emptyText.style.color = 'rgba(255, 255, 255, 0.7)';
        emptyText.style.marginBottom = '20px';
        
        const createButton = document.createElement('button');
        createButton.textContent = 'Create New Lobby';
        createButton.style.backgroundColor = '#6c5ce7';
        createButton.style.color = '#fff';
        createButton.style.border = 'none';
        createButton.style.borderRadius = '4px';
        createButton.style.padding = '10px 20px';
        createButton.style.fontSize = '1rem';
        createButton.style.cursor = 'pointer';
        createButton.style.transition = 'all 0.3s ease';
        
        createButton.addEventListener('mouseover', () => {
            createButton.style.backgroundColor = '#5348c7';
        });
        
        createButton.addEventListener('mouseout', () => {
            createButton.style.backgroundColor = '#6c5ce7';
        });
        
        createButton.addEventListener('click', () => {
            document.body.removeChild(popupContainer);
            window.location.href = 'create-lobby.html';
        });
        
        emptyState.appendChild(emptyIcon);
        emptyState.appendChild(emptyTitle);
        emptyState.appendChild(emptyText);
        emptyState.appendChild(createButton);
        
        body.appendChild(emptyState);
    } else {
        // Create lobby list with header sections
        const lobbyList = document.createElement('div');
        lobbyList.className = 'lobby-list';
        
        // Split lobbies into hosted and participating
        const hostedLobbies = lobbies.filter(lobby => lobby.isHost);
        const participatingLobbies = lobbies.filter(lobby => !lobby.isHost);
        
        // Add section for hosted lobbies if any
        if (hostedLobbies.length > 0) {
            const hostedSection = document.createElement('div');
            hostedSection.style.marginBottom = '20px';
            
            const hostedTitle = document.createElement('h3');
            hostedTitle.textContent = 'Your Hosted Lobbies';
            hostedTitle.style.color = '#6c5ce7';
            hostedTitle.style.fontSize = '1.2rem';
            hostedTitle.style.marginBottom = '10px';
            hostedTitle.style.borderBottom = '1px solid rgba(108, 92, 231, 0.2)';
            hostedTitle.style.paddingBottom = '5px';
            
            hostedSection.appendChild(hostedTitle);
            
            // Add hosted lobbies to section
            hostedLobbies.forEach(lobby => {
                const lobbyItem = createLobbyItem(lobby, playerId, playerName);
                hostedSection.appendChild(lobbyItem);
            });
            
            lobbyList.appendChild(hostedSection);
        }
        
        // Add section for participating lobbies if any
        if (participatingLobbies.length > 0) {
            const participatingSection = document.createElement('div');
            
            const participatingTitle = document.createElement('h3');
            participatingTitle.textContent = 'Lobbies You\'re In';
            participatingTitle.style.color = '#00cec9';
            participatingTitle.style.fontSize = '1.2rem';
            participatingTitle.style.marginBottom = '10px';
            participatingTitle.style.borderBottom = '1px solid rgba(0, 206, 201, 0.2)';
            participatingTitle.style.paddingBottom = '5px';
            
            participatingSection.appendChild(participatingTitle);
            
            // Add participating lobbies to section
            participatingLobbies.forEach(lobby => {
                const lobbyItem = createLobbyItem(lobby, playerId, playerName);
                participatingSection.appendChild(lobbyItem);
            });
            
            lobbyList.appendChild(participatingSection);
        }
        
        // Add lobby list to body
        body.appendChild(lobbyList);
    }
    
    // Add header and body to content
    popupContent.appendChild(header);
    popupContent.appendChild(body);
    
    // Add content to container
    popupContainer.appendChild(popupContent);
    
    // Add container to body
    document.body.appendChild(popupContainer);
}

// Helper function to create a lobby item for the selection popup
function createLobbyItem(lobby, playerId, playerName) {
    const lobbyItem = document.createElement('div');
    lobbyItem.className = 'lobby-item';
    lobbyItem.style.padding = '15px';
    lobbyItem.style.marginBottom = '10px';
    lobbyItem.style.backgroundColor = 'rgba(40, 40, 60, 0.8)';
    lobbyItem.style.borderRadius = '5px';
    lobbyItem.style.cursor = 'pointer';
    lobbyItem.style.transition = 'all 0.3s ease';
    lobbyItem.style.border = '1px solid rgba(108, 92, 231, 0.2)';
    
    // Add hover effect
    lobbyItem.addEventListener('mouseover', () => {
        lobbyItem.style.transform = 'translateY(-3px)';
        lobbyItem.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        lobbyItem.style.borderColor = lobby.isHost ? 'rgba(108, 92, 231, 0.6)' : 'rgba(0, 206, 201, 0.6)';
        lobbyItem.style.backgroundColor = 'rgba(50, 50, 70, 0.8)';
    });
    
    lobbyItem.addEventListener('mouseout', () => {
        lobbyItem.style.transform = 'translateY(0)';
        lobbyItem.style.boxShadow = 'none';
        lobbyItem.style.borderColor = lobby.isHost ? 'rgba(108, 92, 231, 0.2)' : 'rgba(0, 206, 201, 0.2)';
        lobbyItem.style.backgroundColor = 'rgba(40, 40, 60, 0.8)';
    });
    
    // Create flex container for better layout
    const flexContainer = document.createElement('div');
    flexContainer.style.display = 'flex';
    flexContainer.style.justifyContent = 'space-between';
    flexContainer.style.alignItems = 'center';
    
    // Create left content (name, game type, etc)
    const leftContent = document.createElement('div');
    
    // Name and status
    const lobbyName = document.createElement('h3');
    lobbyName.textContent = lobby.name;
    lobbyName.style.margin = '0 0 8px 0';
    lobbyName.style.color = '#fff';
    
    // Game icon and type
    const gameInfo = document.createElement('div');
    gameInfo.style.display = 'flex';
    gameInfo.style.alignItems = 'center';
    gameInfo.style.marginBottom = '5px';
    
    // Game icon based on game type
    const gameIcon = document.createElement('span');
    gameIcon.innerHTML = '<i class="fas fa-gamepad"></i>';
    gameIcon.style.marginRight = '5px';
    gameIcon.style.color = '#6c5ce7';
    
    const gameType = document.createElement('span');
    gameType.textContent = lobby.gameType || 'Unknown Game';
    gameType.style.color = 'rgba(255, 255, 255, 0.8)';
    
    gameInfo.appendChild(gameIcon);
    gameInfo.appendChild(gameType);
    
    // Players info
    const playersInfo = document.createElement('div');
    playersInfo.style.display = 'flex';
    playersInfo.style.alignItems = 'center';
    
    const playersIcon = document.createElement('span');
    playersIcon.innerHTML = '<i class="fas fa-users"></i>';
    playersIcon.style.marginRight = '5px';
    playersIcon.style.color = '#00cec9';
    
    const playersCount = document.createElement('span');
    playersCount.textContent = `${lobby.currentPlayers}/${lobby.maxPlayers} players`;
    playersCount.style.color = 'rgba(255, 255, 255, 0.7)';
    
    playersInfo.appendChild(playersIcon);
    playersInfo.appendChild(playersCount);
    
    // Add elements to left content
    leftContent.appendChild(lobbyName);
    leftContent.appendChild(gameInfo);
    leftContent.appendChild(playersInfo);
    
    // Create right content (role badge)
    const rightContent = document.createElement('div');
    
    // Role badge
    const roleBadge = document.createElement('div');
    roleBadge.style.padding = '4px 8px';
    roleBadge.style.borderRadius = '4px';
    roleBadge.style.fontSize = '0.8rem';
    roleBadge.style.fontWeight = 'bold';
    
    if (lobby.isHost) {
        roleBadge.textContent = 'HOST';
        roleBadge.style.backgroundColor = 'rgba(108, 92, 231, 0.2)';
        roleBadge.style.color = '#6c5ce7';
        roleBadge.style.border = '1px solid rgba(108, 92, 231, 0.4)';
    } else {
        roleBadge.textContent = 'MEMBER';
        roleBadge.style.backgroundColor = 'rgba(0, 206, 201, 0.2)';
        roleBadge.style.color = '#00cec9';
        roleBadge.style.border = '1px solid rgba(0, 206, 201, 0.4)';
    }
    
    rightContent.appendChild(roleBadge);
    
    // Add left and right content to flex container
    flexContainer.appendChild(leftContent);
    flexContainer.appendChild(rightContent);
    
    // Add flex container to lobby item
    lobbyItem.appendChild(flexContainer);
    
    // Add click event to send invite
    lobbyItem.addEventListener('click', () => {
        sendInvite(lobby, playerId, playerName);
        const modalContainer = document.querySelector('.modal-container');
        if (modalContainer) {
            document.body.removeChild(modalContainer);
        }
    });
    
    return lobbyItem;
}

// Function to get all lobbies the user is associated with (owned or participating)
function getAllUserLobbies() {
    return new Promise((resolve, reject) => {
        try {
            // Get the current user
            const currentUser = getCurrentUser();
            if (!currentUser) {
                reject(new Error('No user logged in'));
                return;
            }

            console.log('Current user:', currentUser);
            // Show loading notification
            showNotification('Fetching your lobbies...', 'info', true);

            // Fetch lobbies from the API
            console.log('Fetching user hosted lobbies from API...');
            fetch(`${window.APP_CONFIG.API_URL}/lobbies?host=${currentUser._id}`)
                .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch lobbies');
        }
                    return response.json();
                })
                .then(ownedLobbiesData => {
                    console.log('Owned lobbies from API:', ownedLobbiesData);
                    // Transform owned lobbies
                    const ownedLobbies = ownedLobbiesData.map(lobby => ({
                        ...lobby,
                        isHost: true
                    }));
                    console.log('Transformed owned lobbies:', ownedLobbies);

                    // Also fetch lobbies the user is participating in but not hosting
                    console.log('Fetching all lobbies to check participation...');
                    return fetch(`${window.APP_CONFIG.API_URL}/lobbies`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Failed to fetch participating lobbies');
                            }
                            return response.json();
                        })
                        .then(allLobbies => {
                            console.log('All lobbies from API:', allLobbies);
                            // Filter lobbies where user is a participant but not the host
                            const participatingLobbies = allLobbies
                                .filter(lobby => {
                                    // Check if user is a participant but not the host
                                    const isParticipant = lobby.players && 
                                           lobby.players.some(player => {
                                               console.log('Checking player:', player);
                                               return player.user && player.user._id === currentUser._id;
                                           }) &&
                                           lobby.host && lobby.host._id !== currentUser._id;
                                    
                                    if (isParticipant) {
                                        console.log('User is participant in lobby:', lobby.name);
                                    }
                                    return isParticipant;
                                })
                                .map(lobby => ({
                                    ...lobby,
                                    isHost: false
                                }));
                            
                            console.log('Participating lobbies:', participatingLobbies);

                            // Also check localStorage for any active lobbies not returned by API
                            let storedActiveLobbies = [];
                            try {
                                const stored = localStorage.getItem('active_lobbies');
                                console.log('Active lobbies from localStorage:', stored);
                                if (stored) {
                                    storedActiveLobbies = JSON.parse(stored)
                                        .filter(lobby => lobby.host && lobby.host._id !== currentUser._id)
                                        .map(lobby => ({
                                            ...lobby,
                                            isHost: false
                                        }));
                                    console.log('Filtered active lobbies from localStorage:', storedActiveLobbies);
                                }
                            } catch (e) {
                                console.error('Error parsing active lobbies from localStorage:', e);
                            }

                            // Combine all lobbies, giving priority to API results
                            const apiLobbyIds = [...ownedLobbies, ...participatingLobbies].map(lobby => lobby._id);
                            console.log('API lobby IDs:', apiLobbyIds);
                            
                            const filteredStoredLobbies = storedActiveLobbies.filter(
                                lobby => !apiLobbyIds.includes(lobby._id)
                            );
                            console.log('Filtered stored lobbies:', filteredStoredLobbies);

                            const combinedApiLobbies = [...ownedLobbies, ...participatingLobbies, ...filteredStoredLobbies];
                            console.log('FINAL COMBINED LOBBIES:', combinedApiLobbies);

                            if (combinedApiLobbies.length === 0) {
                                showNotification('You have no active lobbies. Create a lobby first.', 'info');
                            }

                            resolve(combinedApiLobbies);
                        });
                })
                .catch(error => {
        console.error('Error fetching lobbies:', error);
                    
                    // Fallback to localStorage if API fails
                    showNotification('Using cached lobby data', 'warning');
                    console.log('Falling back to localStorage data');
                    
                    const storedLobbies = localStorage.getItem('user_lobbies');
                    const storedActiveLobbies = localStorage.getItem('active_lobbies');
                    
                    console.log('user_lobbies from localStorage:', storedLobbies);
                    console.log('active_lobbies from localStorage:', storedActiveLobbies);
                    
                    let ownedLobbies = [];
                    let participatingLobbies = [];
                    
                    // Parse owned lobbies
                    if (storedLobbies) {
                        try {
                            const lobbies = JSON.parse(storedLobbies);
                            ownedLobbies = lobbies.map(lobby => ({
                                ...lobby,
                                isHost: true
                            }));
                            console.log('Owned lobbies from localStorage:', ownedLobbies);
                        } catch (e) {
                            console.error('Error parsing stored lobbies:', e);
                        }
                    }
                    
                    // Parse lobbies user is participating in
                    if (storedActiveLobbies) {
                        try {
                            const activeLobbies = JSON.parse(storedActiveLobbies);
                            participatingLobbies = activeLobbies
                                .filter(lobby => lobby.host && lobby.host._id !== currentUser._id)
                                .map(lobby => ({
                                    ...lobby,
                                    isHost: false
                                }));
                            console.log('Participating lobbies from localStorage:', participatingLobbies);
                        } catch (e) {
                            console.error('Error parsing active lobbies:', e);
                        }
                    }
                    
                    // Combine both arrays
                    const combinedLobbies = [...ownedLobbies, ...participatingLobbies];
                    console.log('FINAL COMBINED LOBBIES (localStorage fallback):', combinedLobbies);
                    
                    if (combinedLobbies.length === 0) {
                        showNotification('No active lobbies found. Create a lobby first.', 'info');
                    }
                    
                    resolve(combinedLobbies);
                });
    } catch (error) {
            console.error('Error getting user lobbies:', error);
            reject(error);
        }
    });
}

// Function to send the invitation
function sendInvite(lobby, playerId, playerName) {
    // Get current user
    const currentUser = getCurrentUser();
    
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
    
    // For this demo, we don't need to send API requests since the /invites/send endpoint doesn't exist
    // and would just cause 404 errors in the console
    /* 
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
    */
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