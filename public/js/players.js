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
    
    // Initialize the SocketHandler connection if it's not already active
    if (window.SocketHandler && !window.SocketHandler.isConnected) {
        console.log('Initializing SocketHandler from players.js');
        window.SocketHandler.init();
        
        // Add listener for friend requests
        if (window.SocketHandler && window.SocketHandler.socket) {
            window.SocketHandler.socket.on('new-friend-request', (data) => {
                console.log('Friend request received in players page:', data);
                
                // Validate friend request before showing it
                if (data && data.senderId && data.senderName && data.senderName !== 'Unknown User') {
                showFriendRequestFrame(data);
                } else {
                    console.warn('Received invalid friend request data:', data);
                }
            });
        }
    }
    
    // Then load the players data
    setTimeout(() => {
        loadPlayers();
        
        // Check for any existing friend requests
        checkForFriendRequests();
    }, 100); // Small delay to ensure everything is ready
});

function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Game type selector
    const gameTypeSelector = document.getElementById('game-filter');
    if (gameTypeSelector) {
        gameTypeSelector.addEventListener('change', filterPlayers);
    }
    
    // Rank selector
    const rankSelector = document.getElementById('rank-filter');
    if (rankSelector) {
        rankSelector.addEventListener('change', filterPlayers);
    }
    
    // Search input
    const searchInput = document.getElementById('player-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterPlayers);
    }
    
    // Search button
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', filterPlayers);
    }
    
    // Reset filters button
        const resetFiltersBtn = document.getElementById('resetFilters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetFilters);
        }
    
    // Add a button to refresh player status
    const controlsContainer = document.querySelector('.players-controls');
    if (controlsContainer) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'btn btn-secondary refresh-players-btn';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Status';
        refreshBtn.title = 'Refresh friend status for all players';
        refreshBtn.addEventListener('click', () => {
            // Show spinning animation on the icon
            const icon = refreshBtn.querySelector('i');
            icon.classList.add('fa-spin');
            refreshBtn.disabled = true;
            
            // Reload friends data then update UI
            Promise.all([
                window.FriendsService?.loadFriends(),
                window.FriendsService?.loadFriendRequests()
            ])
            .then(() => {
                refreshFriendStatus();
                // Stop spinning animation
                setTimeout(() => {
                    icon.classList.remove('fa-spin');
                    refreshBtn.disabled = false;
                }, 500);
                showNotification('Friend status refreshed', 'success');
            })
            .catch(err => {
                console.error('Error refreshing friend status:', err);
                icon.classList.remove('fa-spin');
                refreshBtn.disabled = false;
                showNotification('Error refreshing status', 'error');
            });
        });
        
        // Add the button to the controls
        controlsContainer.appendChild(refreshBtn);
        
        // Add some CSS for the button
        const style = document.createElement('style');
        style.textContent = `
            .refresh-players-btn {
                margin-left: 10px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .fa-spin {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add friend buttons (for existing buttons when the function runs)
    setupAddFriendButtons();
    
    // Add friend event listeners
    setupFriendEventListeners();
    
    // Check for friend requests
    checkForFriendRequests();
    
    // Set up an interval to refresh friend status periodically
    setInterval(refreshFriendStatus, 30000); // Refresh every 30 seconds
    
    console.log('Event listeners setup complete');
}

// Helper function to setup add friend buttons across the page
function setupAddFriendButtons() {
    const addFriendButtons = document.querySelectorAll('.add-friend-btn');
    console.log(`Setting up ${addFriendButtons.length} add friend buttons`);
    
    addFriendButtons.forEach(button => {
        // Remove existing event listeners to prevent duplicates
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
        
        // Add new event listener
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const playerId = this.getAttribute('data-id');
            const playerCard = this.closest('.player-card');
            let playerName = 'this player';
            
            if (playerCard) {
                const nameElement = playerCard.querySelector('.player-name');
                if (nameElement) {
                    playerName = nameElement.textContent;
                }
            }
            
            console.log(`Add friend button clicked for ${playerName} (${playerId})`);
            addFriend(playerId, playerName);
        });
    });
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

// Display players in the UI
function displayPlayers(players) {
    console.log(`Displaying ${players.length} players`);
    
    // Get the container for the player cards
    const playersContainer = document.getElementById('playersContainer');
    if (!playersContainer) {
        console.error('Players container not found');
        return;
    }
    
    // Clear existing player cards
    playersContainer.innerHTML = '';
    
    // If no players, show message
    if (!players || players.length === 0) {
        if (noPlayersMessage) {
            noPlayersMessage.classList.remove('d-none');
        }
        
        // Add an empty state message to the container
        playersContainer.innerHTML = `
            <div class="empty-state" style="width: 100%; padding: 50px; text-align: center;">
                <i class="fas fa-users-slash" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.6;"></i>
                <h3>No players found</h3>
                <p>Try adjusting your search filters</p>
                <button id="resetFiltersEmpty" class="btn btn-primary mt-3">
                    <i class="fas fa-sync"></i> Reset Filters
                </button>
            </div>
        `;
        
        // Add event listener to the reset button
        const resetBtn = document.getElementById('resetFiltersEmpty');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetFilters);
        }
        
        return;
    }
    
    // Hide the no players message if it exists
    if (noPlayersMessage) {
        noPlayersMessage.classList.add('d-none');
    }
    
    // Create and append player cards
    players.forEach(player => {
        const card = createPlayerCard(player);
        playersContainer.appendChild(card);
    });
    
    // After displaying players, update friend status for each player card
    setTimeout(() => {
        refreshFriendStatus();
    }, 100);
    
    console.log('Player cards displayed successfully');
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

// Function to send a friend request (previously named addFriend)
async function addFriend(playerId, playerName) {
    if (!isLoggedIn()) {
        showNotification('Please log in to send friend requests', 'error');
        return;
    }
    
    try {
        // Check if we're using the global FriendsService
        if (window.FriendsService) {
            console.log('Using FriendsService to add friend');
            
            // Create friend data object
            const friendData = {
                id: playerId,
                username: playerName,
                status: 'offline' // Default status until we get a real status update
            };
            
            // Use FriendsService to send a friend request
            const result = await window.FriendsService.sendFriendRequest(friendData);
            
            // Update UI to show pending status
            updateFriendButtonUI(playerId, playerName, 'pending');
            showNotification(`Friend request sent to ${playerName}!`, 'success');
            
            return;
        }
        
        // Get current user info
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser._id) {
            showNotification('User information not found', 'error');
            return;
        }
        
        // Get token for authorization
        const token = localStorage.getItem('token');
        console.log('Auth token:', token ? 'Token exists' : 'No token found');
        
        // Construct API URL for friend requests (not direct add)
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        const requestUrl = `${apiUrl}/friends/request/${playerId}`;
        
        console.log('Debug - Sending friend request:');
        console.log('- URL:', requestUrl);
        console.log('- Current user:', currentUser._id);
        console.log('- Friend ID:', playerId);
        console.log('- Friend Name:', playerName);
        
        // Make the API call to send a friend request
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: `${currentUser.username} would like to be your friend!`
            })
        });
        
        console.log('Friend request response status:', response.status);
        
        // Process the response
        const responseData = await response.json();
        console.log('Friend request response data:', responseData);
        
        if (response.ok) {
            // Get the request ID from the response if available
            const requestId = responseData.requestId || responseData.friendRequest?._id || `local_${Date.now()}`;
            
            // Update the UI to show pending status
            updateFriendButtonUI(playerId, playerName, 'pending');
            
            // Update localStorage to reflect the pending request
            updateFriendRequestInLocalStorage(playerId, playerName, requestId);
            
            // Show success notification
            showNotification(`Friend request sent to ${playerName}!`, 'success');
            
            // Emit socket event to notify recipient in real-time
            try {
                const message = `${currentUser.username} would like to be your friend!`;
                const socketData = {
                    recipientId: playerId,
                    senderName: currentUser.username,
                    senderId: currentUser._id,
                    message: message,
                    requestId: requestId
                };
                
                console.log('Emitting socket event with data:', socketData);
                
                // Use SocketHandler if available (preferred method)
                if (window.SocketHandler && window.SocketHandler.socket) {
                    console.log('Sending via SocketHandler');
                    window.SocketHandler.socket.emit('friend-request-sent', socketData);
                    
                    // Add event listener for confirmation if not already listening
                    if (!window.SocketHandler.socket._callbacks['friend-request-sent-confirmation']) {
                        window.SocketHandler.socket.on('friend-request-sent-confirmation', (confirmData) => {
                            console.log('Received friend request confirmation:', confirmData);
                        });
                    }
                } 
                // Directly use io if available as fallback
                else if (typeof io !== 'undefined') {
                    console.log('Creating new socket connection using global io');
                    // Get the correct server URL from config
                    const serverURL = window.APP_CONFIG?.SERVER_URL || window.location.origin;
                    const socket = io(serverURL);
                    
                    // Authenticate the socket before sending the friend request
                    socket.on('connect', () => {
                        console.log('Socket connected, authenticating...');
                        // First authenticate
                        socket.emit('authenticate', { 
                            userId: currentUser._id,
                            token: token
                        });
                        
                        // When authenticated, send the friend request
                        socket.on('authenticated', () => {
                            console.log('Socket authenticated, sending friend request');
                            socket.emit('friend-request-sent', socketData);
                        });
                        
                        // Listen for confirmation
                        socket.on('friend-request-sent-confirmation', (confirmData) => {
                            console.log('Received confirmation:', confirmData);
                            // Close socket after confirmation received
                            socket.disconnect();
                        });
                    });
                } else {
                    console.warn('Socket.io not available, friend request notification will not be sent in real-time');
                    // API request was still successful, so the request is saved in the database
                }
            } catch (socketError) {
                console.warn('Socket notification failed, but HTTP request succeeded:', socketError);
                // API request was still successful, so we don't need to show an error
            }
        } else {
            // Show error notification
            console.error('Error details:', responseData.error);
            showNotification(responseData.message || 'Failed to send friend request', 'error');
        }
    } catch (error) {
        console.error('Error in sending friend request:', error);
        showNotification('Failed to send friend request. Please try again later.', 'error');
    }
}

// Helper function to update friend request in localStorage
function updateFriendRequestInLocalStorage(friendId, friendName, requestId) {
    console.log(`Adding friend request to localStorage: ${friendName} (${friendId})`);
    
    // Get current user info
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
        throw new Error('No user info in localStorage');
    }
    
    const userInfo = JSON.parse(userInfoStr);
    
    // Ensure friendRequests structure exists
    if (!userInfo.friendRequests) {
        userInfo.friendRequests = { sent: [], received: [] };
    }
    
    if (!userInfo.friendRequests.sent) {
        userInfo.friendRequests.sent = [];
    }
    
    // Check if request is already in the list
    const existingRequest = userInfo.friendRequests.sent.find(request => 
        (request.recipient && request.recipient._id === friendId) ||
        (request.recipient === friendId)
    );
    
    if (!existingRequest) {
        // Add friend request with complete info
        userInfo.friendRequests.sent.push({
            _id: requestId,
            recipient: {
                _id: friendId,
                username: friendName
            },
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        // Update localStorage
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log(`Friend request to ${friendName} added to localStorage`);
    } else {
        console.log(`Friend request to ${friendName} already exists in localStorage`);
    }
}

// Helper function to update the friend button UI
function updateFriendButtonUI(playerId, playerName, status) {
    // Find all add friend buttons with this player ID (could be multiple cards)
    const addFriendBtns = document.querySelectorAll(`[data-id="${playerId}"].add-friend-btn, [data-id="${playerId}"].btn-secondary`);
    
    addFriendBtns.forEach(btn => {
        // Remove click event listeners by replacing with clone
        const newBtn = btn.cloneNode(true);
        
        if (status === true || status === 'friend') {
            // Update button to show friend status
            newBtn.className = 'btn btn-secondary';
            newBtn.innerHTML = '<i class="fas fa-check"></i> Friend';
            newBtn.title = `${playerName} is your friend`;
        } else if (status === 'pending') {
            // Update button to show pending status
            newBtn.className = 'btn btn-secondary';
            newBtn.innerHTML = '<i class="fas fa-clock"></i> Pending';
            newBtn.title = `Friend request sent to ${playerName}`;
        } else {
            // If there was an error, keep the button clickable
            newBtn.className = 'btn btn-secondary add-friend-btn';
            newBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add';
            newBtn.title = `Send a friend request to ${playerName}`;
        }
        
        // Replace the old button with the new one
        if (btn.parentNode) {
            btn.parentNode.replaceChild(newBtn, btn);
        }
    });
}

// Helper to check if a player is already a friend or has a pending request
function checkIfFriend(playerId) {
    try {
        // First check if we have FriendsService available
        if (window.FriendsService) {
            const friends = window.FriendsService.getAllFriends?.() || [];
            if (friends && Array.isArray(friends)) {
                // Check if the player is in our friends list
                const isFriend = friends.some(friend => {
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
            
            // Also check for pending requests
            const requests = window.FriendsService.getPendingRequests?.() || { sent: [] };
            if (requests && requests.sent) {
                const isPending = requests.sent.some(request => {
                    if (typeof request.recipient === 'string') {
                        return request.recipient === playerId;
                    } else if (request.recipient && request.recipient._id) {
                        return request.recipient._id === playerId;
                    }
                    return false;
                });
                
                if (isPending) {
                    return 'pending';
                }
            }
        }
        
        // Fallback to checking user info from localStorage
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
        
        // Check for pending friend requests
        if (currentUser.friendRequests && currentUser.friendRequests.sent) {
            // Check if there's a pending friend request
            const pendingRequest = currentUser.friendRequests.sent.some(request => {
                // Handle different data structures
                if (typeof request.recipient === 'string') {
                    return request.recipient === playerId;
                } else if (request.recipient && request.recipient._id) {
                    return request.recipient._id === playerId;
                }
                return false;
            });
            
            if (pendingRequest) {
                return 'pending';
            }
        }
        
        // Check if the request was confirmed and the user is now a friend
        // This might be needed if the localStorage wasn't updated yet
        const token = localStorage.getItem('token');
        if (token) {
            // Force refresh of friend status from API when rendering players next time
            setTimeout(() => {
                if (window.FriendsService && typeof window.FriendsService.loadFriends === 'function') {
                    window.FriendsService.loadFriends();
                }
            }, 1000);
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
    
    // Add click event to send invite with visual feedback
    lobbyItem.addEventListener('click', () => {
        // Visual feedback - show "Sending..." status
        const originalBackgroundColor = lobbyItem.style.backgroundColor;
        const originalContent = flexContainer.innerHTML;
        
        // Change to loading state
        lobbyItem.style.backgroundColor = 'rgba(108, 92, 231, 0.2)';
        flexContainer.innerHTML = `<div style="width: 100%; text-align: center; padding: 15px 0;">
            <span style="color: #fff; font-weight: bold;">
                <i class="fas fa-paper-plane" style="margin-right: 10px;"></i>Sending invitation...
            </span>
        </div>`;
        
        // Send the invite
        sendInvite(lobby, playerId, playerName);
        
        // Show success state briefly before closing
        setTimeout(() => {
            flexContainer.innerHTML = `<div style="width: 100%; text-align: center; padding: 15px 0;">
                <span style="color: #00b894; font-weight: bold;">
                    <i class="fas fa-check-circle" style="margin-right: 10px;"></i>Invitation sent!
                </span>
            </div>`;
            
            // Close the popup after a brief delay
            setTimeout(() => {
                const modalContainer = document.querySelector('.modal-container');
                if (modalContainer) {
                    document.body.removeChild(modalContainer);
                }
            }, 800);
        }, 600);
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
    if (!currentUser || !currentUser._id || !currentUser.username) {
        console.error('Current user information is missing');
        showNotification('Unable to send invite: User information missing', 'error');
        return;
    }
    
    if (!lobby || !lobby._id) {
        console.error('Invalid lobby data:', lobby);
        showNotification('Unable to send invite: Lobby information missing', 'error');
        return;
    }
    
    // Generate a unique invite ID
    const inviteId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    
    console.log(`Sending invite to ${playerName} (${playerId}) for lobby: ${lobby.name} (${lobby._id})`);
    
    // Create the invite object
    const invite = {
        id: inviteId,
        senderId: currentUser._id,
        senderName: currentUser.username,
        recipientId: playerId,
        recipientName: playerName,
        lobbyId: lobby._id,
        lobbyName: lobby.name,
        gameType: lobby.gameType || 'Unknown',
        message: `${currentUser.username} has invited you to join "${lobby.name}"!`,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    console.log('Created invite object:', invite);
    
    // First try to use socket.io to deliver the invite in real-time
    if (window.io && typeof window.io === 'function') {
        try {
            const apiUrl = window.API_URL || window.APP_CONFIG?.API_URL || 'http://localhost:8080';
            const socket = io(apiUrl);
            
            console.log('Sending invite via socket');
            socket.emit('send-invite', invite);
            
            // Even if socket fails, we still try the API and fallback
        } catch (socketError) {
            console.warn('Socket delivery failed:', socketError);
        }
    }
    
    // Store the invite in localStorage (as fallback)
    try {
        console.log('Storing invite in localStorage as fallback');
        let invites = [];
        const invitesStr = localStorage.getItem('invites');
        
        if (invitesStr) {
            try {
                invites = JSON.parse(invitesStr);
            } catch (e) {
                console.error('Error parsing existing invites:', e);
                invites = [];
            }
        }
        
        // Add new invite to the array
        invites.push(invite);
        
        // Save back to localStorage
        localStorage.setItem('invites', JSON.stringify(invites));
        console.log('Invite saved to localStorage');
    } catch (localStorageError) {
        console.error('Error saving invite to localStorage:', localStorageError);
    }
    
    // Send the invite to the API 
    try {
        console.log('Sending invite to API');
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        
        fetch(`${apiUrl}/invites/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                id: inviteId,
                senderId: currentUser._id,
                senderName: currentUser.username,
                recipientId: playerId,
                recipientName: playerName,
                lobbyId: lobby._id,
                lobbyName: lobby.name,
                gameType: lobby.gameType || 'Unknown',
                message: `${currentUser.username} has invited you to join their lobby!`
            })
        })
        .then(response => {
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        // Try to parse as JSON
                        const errorData = JSON.parse(text);
                        throw new Error(errorData.message || 'Failed to send invite through API');
                    } catch (e) {
                        // If parsing fails, use the raw text
                        throw new Error(`API Error (${response.status}): ${text || 'Unknown error'}`);
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Invite sent successfully via API:', data);
            showNotification(`Invitation sent to ${playerName}`, 'success');
        })
        .catch(error => {
            console.warn('API invite error:', error);
            // Still show success since we saved to localStorage as fallback
            showNotification(`Invitation sent to ${playerName} (using fallback method)`, 'info');
        });
    } catch (error) {
        console.warn('Error sending invite to server:', error);
        // Still show success since we saved to localStorage
        showNotification(`Invitation sent to ${playerName} (using fallback method)`, 'info');
    }
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
    // Check if there's a global notification function that is NOT this same function
    if (window.showNotification && typeof window.showNotification === 'function' && 
        window.showNotification !== showNotification) {
        // Call the global notification function
        window.showNotification(message, type, autoHide);
        return;
    }
    
    // Fallback to alert for critical errors if no UI
    if (type === 'error') {
        alert(message);
        return;
    }
    
    // Log to console as last resort
    console.log(`[${type.toUpperCase()}] ${message}`);
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

// Function to check for existing friend requests
function checkForFriendRequests() {
    const userInfo = getCurrentUser();
    if (!userInfo || !userInfo.friendRequests || !userInfo.friendRequests.received) {
        return;
    }
    
    // Filter out invalid friend requests (those with missing sender information)
    const received = userInfo.friendRequests.received.filter(request => {
        // Validate sender data exists and is not "Unknown User"
        const hasSender = request.sender && 
                        (typeof request.sender === 'object' ? 
                            (request.sender._id && request.sender.username && request.sender.username !== 'Unknown User') : 
                            request.sender);
        
        const hasSenderName = request.senderName && request.senderName !== 'Unknown User';
        
        return hasSender || hasSenderName;
    });
    
    if (received.length > 0) {
        console.log(`Found ${received.length} valid friend requests`);
        
        // If there are requests, show the frame
        const friendRequestsFrame = document.getElementById('friendRequestsFrame');
        if (friendRequestsFrame) {
            friendRequestsFrame.style.display = 'block';
            
            // Get the list container
            const friendRequestsList = document.getElementById('friendRequestsList');
            if (friendRequestsList) {
                // Clear existing content
                friendRequestsList.innerHTML = '';
                
                // Add each request to the list
                received.forEach(request => {
                    const senderName = request.sender?.username || request.senderName || 'A user';
                    const senderId = request.sender?._id || request.sender;
                    const message = request.message || `${senderName} would like to be your friend!`;
                    const requestId = request._id;
                    
                    // Additional validation before adding to UI
                    if (senderId && requestId && senderName !== 'Unknown User') {
                        addFriendRequestToFrame({
                            senderName: senderName,
                            senderId: senderId,
                            message: message,
                            requestId: requestId
                        });
                    } else {
                        console.warn('Skipping invalid friend request:', request);
                    }
                });
                
                // If all requests were filtered out as invalid
                if (friendRequestsList.children.length === 0) {
                    // Clean up invalid requests from local storage
                    cleanupInvalidFriendRequests();
                    friendRequestsFrame.style.display = 'none';
                }
            }
        }
    }
}

// New function to clean up invalid friend requests from local storage
function cleanupInvalidFriendRequests() {
    const userInfo = getCurrentUser();
    if (!userInfo || !userInfo.friendRequests) {
        return;
    }
    
    // Get only valid friend requests
    if (userInfo.friendRequests.received) {
        userInfo.friendRequests.received = userInfo.friendRequests.received.filter(request => {
            const hasSender = request.sender && 
                            (typeof request.sender === 'object' ? 
                                (request.sender._id && request.sender.username && request.sender.username !== 'Unknown User') : 
                                request.sender);
            
            const hasSenderName = request.senderName && request.senderName !== 'Unknown User';
            
            return hasSender || hasSenderName;
        });
    }
    
    // Update localStorage
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    console.log('Cleaned up invalid friend requests from local storage');
    
    // If FriendsService is available, sync with its data
    if (window.FriendsService && typeof window.FriendsService.loadFriendRequests === 'function') {
        window.FriendsService.loadFriendRequests();
    }
}

// Function to show the friend request frame
function showFriendRequestFrame(data) {
    console.log('Showing friend request frame with data:', data);
    
    const friendRequestsFrame = document.getElementById('friendRequestsFrame');
    if (!friendRequestsFrame) {
        console.error('Friend requests frame not found');
        return;
    }
    
    // Show the frame
    friendRequestsFrame.style.display = 'block';
    
    // Add the request to the frame
    addFriendRequestToFrame(data);
    
    // Add close button functionality if not already added
    const closeBtn = document.getElementById('closeFriendRequests');
    if (closeBtn) {
        // Remove any existing event listeners
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        
        newCloseBtn.addEventListener('click', () => {
            friendRequestsFrame.style.display = 'none';
        });
    }
}

// Function to add a friend request to the frame
function addFriendRequestToFrame(data) {
    console.log('Adding friend request to frame:', data);
    
    const friendRequestsList = document.getElementById('friendRequestsList');
    if (!friendRequestsList) {
        console.error('Friend requests list not found');
        return;
    }
    
    // If there's an empty state message, remove it
    const emptyState = friendRequestsList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Check if this request already exists in the list
    const existingRequest = friendRequestsList.querySelector(`[data-sender-id="${data.senderId}"]`);
    if (existingRequest) {
        console.log('Request already in list, not adding again');
        return;
    }
    
    // Format the request item HTML
    const requestItem = document.createElement('div');
    requestItem.className = 'friend-request-item';
    requestItem.dataset.id = data.requestId;
    requestItem.dataset.senderId = data.senderId;
    requestItem.dataset.senderName = data.senderName;
    
    requestItem.innerHTML = `
        <div class="request-info">
            <strong>${data.senderName}</strong>
            <p>${data.message || `${data.senderName} would like to be your friend!`}</p>
        </div>
        <div class="request-actions">
            <button class="btn btn-primary accept-request" data-id="${data.requestId}" data-sender-id="${data.senderId}" data-sender-name="${data.senderName}">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="btn btn-danger reject-request" data-id="${data.requestId}" data-sender-id="${data.senderId}" data-sender-name="${data.senderName}">
                <i class="fas fa-times"></i> Decline
            </button>
        </div>
    `;
    
    // Add to the list
    friendRequestsList.appendChild(requestItem);
    
    // Add event listeners to the buttons
    const acceptBtn = requestItem.querySelector('.accept-request');
    const rejectBtn = requestItem.querySelector('.reject-request');
    
    acceptBtn.addEventListener('click', () => {
        const requestId = acceptBtn.dataset.id;
        const senderId = acceptBtn.dataset.senderId;
        const senderName = acceptBtn.dataset.senderName;
        
        console.log(`Accepting friend request: ID=${requestId}, sender=${senderId}, name=${senderName}`);
        
        if (window.SocketHandler && typeof window.SocketHandler.acceptFriendRequest === 'function') {
            // Use SocketHandler if available
            window.SocketHandler.acceptFriendRequest(requestId, senderId, senderName);
        } else {
            // Fallback to direct accept function
            acceptFriendRequest(requestId, senderId, senderName);
        }
        
        requestItem.remove();
        
        // Check if there are no more requests
        if (friendRequestsList.children.length === 0) {
            friendRequestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No friend requests</p>
                </div>
            `;
            
            // Hide the frame after a delay
            setTimeout(() => {
                const frame = document.getElementById('friendRequestsFrame');
                if (frame) {
                    frame.style.display = 'none';
                }
            }, 2000);
        }
    });
    
    rejectBtn.addEventListener('click', () => {
        const requestId = rejectBtn.dataset.id;
        const senderId = rejectBtn.dataset.senderId;
        
        if (window.SocketHandler && typeof window.SocketHandler.rejectFriendRequest === 'function') {
            // Use SocketHandler if available
            window.SocketHandler.rejectFriendRequest(requestId, senderId);
        } else {
            // Fallback to direct reject function
            rejectFriendRequest(requestId, senderId);
        }
        
        requestItem.remove();
        
        // Check if there are no more requests
        if (friendRequestsList.children.length === 0) {
            friendRequestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No friend requests</p>
                </div>
            `;
            
            // Hide the frame after a delay
            setTimeout(() => {
                const frame = document.getElementById('friendRequestsFrame');
                if (frame) {
                    frame.style.display = 'none';
                }
            }, 2000);
        }
    });
}

/**
 * Accept friend request fallback function if SocketHandler is not available
 */
function acceptFriendRequest(requestId, senderId, senderName) {
    if (!requestId || !senderId) {
        console.error('Missing required parameters for accepting friend request');
        showNotification('Error', 'Could not process friend request', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Error', 'You must be logged in to accept friend requests', 'error');
        return;
    }
    
    // Show loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    document.body.appendChild(loadingOverlay);
    
    // Get the API URL from config
    const apiUrl = window.APP_CONFIG?.API_URL || '/api';
    
    // Make API call to accept the request
    fetch(`${apiUrl}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            senderId: senderId,
            senderName: senderName
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Remove loading overlay
        loadingOverlay.remove();
        
        if (data.success) {
            // Update localStorage
            if (data.userInfo) {
                localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
            }
            
            // Show success notification
            showNotification('Success', `Friend request from ${senderName} accepted!`, 'success');
        } else {
            showNotification('Error', data.message || 'Failed to accept friend request', 'error');
        }
    })
    .catch(error => {
        // Remove loading overlay
        loadingOverlay.remove();
        
        console.error('Error accepting friend request:', error);
        showNotification('Error', 'Could not accept friend request. Please try again later.', 'error');
        
        // Retry on 404 with sync
        if (error.message && error.message.includes('404')) {
            // Try to sync friend request
            fetch(`${apiUrl}/friends/sync-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestId: requestId,
                    senderId: senderId,
                    message: `${senderName} would like to be your friend!`
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Info', 'Please try accepting the friend request again', 'info');
                }
            });
        }
    });
}

/**
 * Reject friend request fallback function if SocketHandler is not available
 */
function rejectFriendRequest(requestId, senderId) {
    if (!requestId || !senderId) {
        console.error('Missing required parameters for rejecting friend request');
        showNotification('Error', 'Could not process friend request', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Error', 'You must be logged in to reject friend requests', 'error');
        return;
    }
    
    // Show loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    document.body.appendChild(loadingOverlay);
    
    // Get the API URL from config
    const apiUrl = window.APP_CONFIG?.API_URL || '/api';
    
    // Make API call to reject the request
    fetch(`${apiUrl}/friends/reject/${requestId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            senderId: senderId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Remove loading overlay
        loadingOverlay.remove();
        
        if (data.success) {
            // Update localStorage
            if (data.userInfo) {
                localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
            }
            
            // Show success notification
            showNotification('Friend request rejected', 'info');
        } else {
            showNotification('Error', data.message || 'Failed to reject friend request', 'error');
        }
    })
    .catch(error => {
        // Remove loading overlay
        loadingOverlay.remove();
        
        console.error('Error rejecting friend request:', error);
        showNotification('Error', 'Could not reject friend request. Please try again later.', 'error');
    });
}

// Function to refresh the friend status in the players tab
function refreshFriendStatus() {
    // Get all player cards
    const playerCards = document.querySelectorAll('.player-card');
    
    playerCards.forEach(card => {
        const playerId = card.dataset.id;
        const playerName = card.querySelector('.player-name')?.textContent || 'Player';
        
        if (playerId) {
            const friendStatus = checkIfFriend(playerId);
            updateFriendButtonUI(playerId, playerName, friendStatus);
        }
    });
}

// Setup socket listeners for friend-related events
function setupFriendEventListeners() {
    // If SocketHandler is available, set up listeners
    if (window.SocketHandler && window.SocketHandler.socket) {
        // Listen for friend request accepted events
        window.SocketHandler.socket.on('friend-request-accepted', (data) => {
            console.log('Friend request accepted:', data);
            
            // Refresh local user data
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    const senderId = data.acceptedBy;
                    
                    // Update the UI to show friend status instead of pending
                    refreshFriendStatus();
                    
                    // Show notification
                    showNotification(`${data.acceptedByName || 'User'} accepted your friend request!`, 'success');
                } catch (e) {
                    console.error('Error updating friend status after acceptance:', e);
                }
            }
        });
    }
}