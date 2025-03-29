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
    console.log('Players page loaded');
    loadPlayers();
    setupEventListeners();
});

function setupEventListeners() {
    // Game filter
    document.getElementById('game-filter').addEventListener('change', filterPlayers);
    
    // Rank filter
    document.getElementById('rank-filter').addEventListener('change', filterPlayers);
    
    // Search input
    document.getElementById('player-search').addEventListener('input', filterPlayers);
    
    // Reset filters button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

async function loadPlayers() {
    try {
        showLoadingIndicator();
        
        // Get all users
        fetch('/api/users/all')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch players: ${response.status}`);
                }
                return response.json();
            })
            .then(players => {
                console.log('Players loaded:', players);
                
                // Filter out the current user
                const currentUser = getCurrentUser();
                const filteredPlayers = currentUser ? 
                    players.filter(player => player._id !== currentUser._id) : 
                    players;
                
                displayPlayers(filteredPlayers);
                hideLoadingIndicator();
            })
            .catch(error => {
                console.error('Error loading players:', error);
                showErrorMessage('Failed to load players. Please try again later.');
                hideLoadingIndicator();
            });
    } catch (error) {
        console.error('Error in loadPlayers function:', error);
        showErrorMessage('An error occurred while loading players.');
        hideLoadingIndicator();
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
    card.className = 'player-card';
    card.setAttribute('data-player-id', player._id);
    
    // Extract profile data safely
    const profile = player.profile || {};
    const username = player.username || 'Unknown Player';
    const displayName = profile.displayName || username;
    
    // Use default values if properties are missing
    const avatar = profile.avatar || 'default-avatar.png';
    const level = profile.level || 1;
    const isOnline = profile.isOnline || false;
    
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
        friendBtnHtml = `<button class="btn friend-added" data-id="${player._id}" style="background-color: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: default;">
            <i class="fas fa-check"></i> Friend
        </button>`;
    } else if (friendStatus === 'pending') {
        // Request pending
        friendBtnHtml = `<button class="btn friend-requested" data-id="${player._id}" style="background-color: #ffc107; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: default;">
            <i class="fas fa-clock"></i> Pending
        </button>`;
    } else {
        // Not friends yet
        friendBtnHtml = `<button class="btn add-friend-btn" data-id="${player._id}" style="background-color: var(--secondary-color); color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
            <i class="fas fa-user-plus"></i> Add
        </button>`;
    }
    
    card.innerHTML = `
        <div class="player-header">
            <div class="player-info">
                ${avatarHtml}
                <div class="player-name">${displayName}</div>
            </div>
            <div class="player-status ${isOnline ? 'online' : 'offline'}">
                ${isOnline ? 'Online' : 'Offline'}
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
            <div class="player-actions" style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                <button class="btn view-profile-btn" data-id="${player._id}" style="background-color: var(--primary-color); color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-user"></i> Profile
                </button>
                ${friendBtnHtml}
                <button class="btn invite-lobby-btn" data-id="${player._id}" style="background-color: #17a2b8; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
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

// Add friend function - now sends a friend request instead of directly adding
async function addFriend(playerId, playerName) {
    if (!isLoggedIn()) {
        showNotification('Please log in to send friend requests', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/friends/request/${playerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update the button to show pending request
            const addFriendBtn = document.querySelector(`.add-friend-btn[data-id="${playerId}"]`);
            if (addFriendBtn) {
                addFriendBtn.className = 'btn friend-requested';
                addFriendBtn.style.backgroundColor = '#ffc107'; // Yellow for pending
                addFriendBtn.innerHTML = '<i class="fas fa-clock"></i> Pending';
                addFriendBtn.style.cursor = 'default';
                // Remove click event listeners
                const newBtn = addFriendBtn.cloneNode(true);
                addFriendBtn.parentNode.replaceChild(newBtn, addFriendBtn);
            }
            
            showNotification(`Friend request sent to ${playerName}!`, 'success');
        } else {
            showNotification(data.message || 'Failed to send friend request', 'error');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showNotification('Failed to send friend request. Please try again later.', 'error');
    }
}

// Helper to check if a player is already a friend or has a pending request
function checkIfFriend(playerId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return false;
        
        // Check if they're already friends
        if (currentUser.friends && currentUser.friends.some(friend => friend === playerId)) {
            return 'friend';
        }
        
        // Check if there's a pending friend request
        if (currentUser.friendRequests && currentUser.friendRequests.sent && 
            currentUser.friendRequests.sent.some(request => request.recipient === playerId)) {
            return 'pending';
        }
        
        return false;
    } catch (error) {
        console.error('Error checking friend status:', error);
        return false;
    }
}

// Invite to lobby function
function inviteToLobby(playerId, playerName) {
    if (!isLoggedIn()) {
        showNotification('Please log in to invite players', 'error');
        return;
    }
    
    // Get current lobbies this user has created
    const currentUser = getCurrentUser();
    
    // Show lobby selection modal
    showLobbySelectionModal(playerId, playerName);
}

// Show lobby selection modal - update to check if user has lobbies properly
function showLobbySelectionModal(playerId, playerName) {
    try {
        // First check if user is logged in
        if (!isLoggedIn()) {
            showNotification('Please log in to invite players to lobbies', 'error');
            return;
        }
        
        // Show loading indicator
        const loadingNotification = showNotification('Loading your lobbies...', 'info', false);
        
        // Fetch user's lobbies
        fetchUserLobbies().then(lobbies => {
            // Remove the loading notification
            if (loadingNotification && loadingNotification.parentNode) {
                document.body.removeChild(loadingNotification);
            }
            
            console.log('User lobbies:', lobbies);
            
            if (!lobbies || lobbies.length === 0) {
                showNotification('You need to create a lobby first to invite players', 'info');
                return;
            }
            
            // Create modal HTML
            const modalHtml = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Invite ${playerName} to Lobby</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <p>Select a lobby to invite this player to:</p>
                        <div class="lobby-list">
                            ${lobbies.map(lobby => `
                                <div class="lobby-option" data-lobby-id="${lobby._id}">
                                    <h3>${lobby.name}</h3>
                                    <p>${lobby.game} | ${lobby.players.length}/${lobby.maxPlayers} players</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-invite" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            
            // Create modal container
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal';
            modalContainer.innerHTML = modalHtml;
            
            // Add to page
            document.body.appendChild(modalContainer);
            
            // Show modal
            setTimeout(() => {
                modalContainer.style.display = 'flex';
            }, 50);
            
            // Add event listeners
            modalContainer.querySelector('.close-modal').addEventListener('click', () => {
                closeModal(modalContainer);
            });
            
            modalContainer.querySelector('#cancel-invite').addEventListener('click', () => {
                closeModal(modalContainer);
            });
            
            // Add event listeners to lobby options
            const lobbyOptions = modalContainer.querySelectorAll('.lobby-option');
            lobbyOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const lobbyId = option.getAttribute('data-lobby-id');
                    sendLobbyInvite(playerId, lobbyId, playerName);
                    closeModal(modalContainer);
                });
            });
        }).catch(error => {
            console.error('Error fetching lobbies:', error);
            showNotification('Failed to load your lobbies. Please try again later.', 'error');
        });
    } catch (error) {
        console.error('Error showing lobby selection modal:', error);
        showNotification('An error occurred. Please try again later.', 'error');
    }
}

// Fetch user's lobbies
async function fetchUserLobbies() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/lobbies/my-lobbies', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch lobbies');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching lobbies:', error);
        return [];
    }
}

// Send lobby invite
async function sendLobbyInvite(userId, lobbyId, playerName) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/invite/${userId}/lobby/${lobbyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`Invitation sent to ${playerName}!`, 'success');
        } else {
            showNotification(data.message || 'Failed to send invitation', 'error');
        }
    } catch (error) {
        console.error('Error sending invitation:', error);
        showNotification('Failed to send invitation. Please try again later.', 'error');
    }
}

// Close modal helper
function closeModal(modalElement) {
    modalElement.style.opacity = '0';
    setTimeout(() => {
        document.body.removeChild(modalElement);
    }, 300);
}

function viewProfile(playerId) {
    window.location.href = `/profile.html?id=${playerId}`;
}

function filterPlayers() {
    const searchInput = document.getElementById('player-search').value.toLowerCase();
    const gameFilter = document.getElementById('game-filter').value;
    const rankFilter = document.getElementById('rank-filter').value;
    
    const playerCards = document.querySelectorAll('.player-card');
    
    playerCards.forEach(card => {
        const playerName = card.querySelector('.player-name').textContent.toLowerCase();
        const playerLevel = card.querySelector('.player-level').textContent;
        
        // Apply filters
        let matchesSearch = playerName.includes(searchInput);
        let matchesGame = true; // We'll implement this with data attributes later
        let matchesRank = true; // We'll implement this with data attributes later
        
        // Show/hide based on filter results
        if (matchesSearch && matchesGame && matchesRank) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function resetFilters() {
    document.getElementById('player-search').value = '';
    document.getElementById('game-filter').value = '';
    document.getElementById('rank-filter').value = '';
    
    // Show all players
    const playerCards = document.querySelectorAll('.player-card');
    playerCards.forEach(card => {
        card.style.display = 'flex';
    });
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
    const errorContainer = document.createElement('div');
    errorContainer.className = 'alert alert-danger';
    errorContainer.textContent = message;
    
    const playersContainer = document.getElementById('playersContainer');
    if (playersContainer) {
        // Clear the container first
        playersContainer.innerHTML = '';
        // Add the error message
        playersContainer.appendChild(errorContainer);
    } else {
        console.error('Players container not found when trying to show error message');
    }
    
    // Also show the message in the console
    console.error(message);
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