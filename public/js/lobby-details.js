// Lobby details page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Get lobby ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('id');
    
    if (!lobbyId) {
        showError('No lobby ID provided');
        return;
    }
    
    // Load lobby details
    loadLobbyDetails(lobbyId);
    
    // Set up chat functionality
    setupChat(lobbyId);
    
    // Set up event listeners
    setupEventListeners(lobbyId);
});

/**
 * Load lobby details from API
 */
async function loadLobbyDetails(lobbyId) {
    try {
        // Show loading state
        document.getElementById('lobby-name').textContent = 'Loading Lobby...';
        
        // Get lobby data
        const response = await window.Lobby.getLobbyById(lobbyId);
        const lobby = response.data;
        
        if (!lobby) {
            showError('Lobby not found');
            return;
        }
        
        console.log('Loaded lobby details:', lobby);
        
        // Update page with lobby details
        updateLobbyDetails(lobby);
        
        // Check if user is host or member and show appropriate controls
        const userInfo = getUserInfo();
        
        if (userInfo && lobby.host._id === userInfo._id) {
            // User is host
            document.getElementById('host-controls').classList.remove('hidden');
            document.getElementById('member-controls').classList.add('hidden');
        } else if (userInfo && lobby.players.some(player => player.user._id === userInfo._id)) {
            // User is member but not host
            document.getElementById('host-controls').classList.add('hidden');
            document.getElementById('member-controls').classList.remove('hidden');
        } else {
            // User is not in the lobby
            document.getElementById('host-controls').classList.add('hidden');
            document.getElementById('member-controls').classList.add('hidden');
            
            // Add join button if not already in lobby and no existing join button
            if (!document.getElementById('join-lobby-btn')) {
                const lobbyActions = document.createElement('div');
                lobbyActions.className = 'lobby-actions';
                lobbyActions.innerHTML = `
                    <button id="join-lobby-btn" class="btn btn-primary">
                        <i class="fas fa-sign-in-alt"></i> Join Lobby
                    </button>
                `;
                document.querySelector('.lobby-description').after(lobbyActions);
                
                // Add event listener to join button
                document.getElementById('join-lobby-btn').addEventListener('click', () => joinLobbyHandler(lobbyId));
            }
        }
        
        // Load members
        updateMembersList(lobby);
        
    } catch (error) {
        console.error('Error loading lobby details:', error);
        showError('Failed to load lobby details');
    }
}

/**
 * Update the lobby details in the UI and determine user membership status
 */
function updateLobbyDetails(lobby) {
    console.log('Updating lobby details with data:', lobby);
    
    // Update game details section
    document.getElementById('game-type').textContent = `Game: ${lobby.gameType || 'Unknown'}`;
    document.getElementById('player-count').textContent = `Players: ${lobby.currentPlayers || 0}/${lobby.maxPlayers || 5}`;
    document.getElementById('host-name').textContent = `Host: ${lobby.host?.username || 'Unknown'}`;
    
    // Set rank information - check for null, undefined, empty string, or 'any'
    const rankValue = (!lobby.rank || lobby.rank === 'any' || lobby.rank === '') 
        ? 'Any' 
        : formatRank(lobby.rank, lobby.gameType);
    document.getElementById('rank-info').textContent = `Rank: ${rankValue}`;
    
    // Set region information - check for null, undefined, empty string, or 'any'
    const regionValue = (!lobby.region || lobby.region === 'any' || lobby.region === '') 
        ? 'Any' 
        : formatRegion(lobby.region);
    document.getElementById('region-info').textContent = `Region: ${regionValue}`;
    
    // Set language information - check for null, undefined, empty string, or 'any'
    const languageValue = (!lobby.language || lobby.language === 'any' || lobby.language === '') 
        ? 'Any' 
        : formatLanguage(lobby.language);
    document.getElementById('language-info').textContent = `Language: ${languageValue}`;
    
    document.getElementById('status-info').textContent = `Status: ${formatStatus(lobby.status) || 'Unknown'}`;

    // Update other UI elements
    document.getElementById('lobby-name').textContent = lobby.name || 'Unnamed Lobby';
    
    // Update game icon if it exists
    const gameIcon = document.getElementById('game-icon');
    if (gameIcon && lobby.gameType) {
        gameIcon.src = `../assets/${lobby.gameType.toLowerCase()}-icon.png`;
        gameIcon.alt = lobby.gameType;
    }

    // Calculate and update creation time
    const createdDate = new Date(lobby.createdAt);
    const timeAgo = getTimeAgo(createdDate);
    document.getElementById('lobby-created').textContent = timeAgo;
    
    // Update description
    document.getElementById('lobby-description-text').textContent = lobby.description || 'No description provided';
    
    // Determine if current user is already a member of this lobby
    const currentUser = getUserInfo();
    let isCurrentUserMember = false;
    let isCurrentUserHost = false;
    
    if (currentUser && currentUser._id) {
        // Check if user is the host
        isCurrentUserHost = lobby.host._id === currentUser._id;
        
        // Check if user is a member (player)
        isCurrentUserMember = lobby.players.some(player => {
            return player.user._id === currentUser._id || 
                   (typeof player.user === 'string' && player.user === currentUser._id);
        });
    }
    
    // Show/hide UI elements based on user status
    const joinButtonContainer = document.querySelector('.lobby-actions');
    const memberControls = document.getElementById('member-controls');
    const hostControls = document.getElementById('host-controls');
    
    if (joinButtonContainer) {
        joinButtonContainer.style.display = isCurrentUserMember ? 'none' : 'block';
    }
    
    if (memberControls) {
        memberControls.classList.toggle('hidden', !isCurrentUserMember || isCurrentUserHost);
    }
    
    if (hostControls) {
        hostControls.classList.toggle('hidden', !isCurrentUserHost);
    }
    
    // Update members list
    updateMembersList(lobby);
}

/**
 * Update the members list in the UI
 */
function updateMembersList(lobby) {
    const membersList = document.getElementById('members-list');
    membersList.innerHTML = ''; // Clear existing members
    
    // Add each member to the list
    lobby.players.forEach(player => {
        const isHost = player.user._id === lobby.host._id;
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        
        // Get first letter of username for avatar
        const firstLetter = player.user.username.charAt(0).toUpperCase();
        
        memberItem.innerHTML = `
            <div class="member-avatar">${firstLetter}</div>
            <div class="member-info">
                <div class="member-name">${player.user.username}</div>
                <div class="member-status ${isHost ? 'host' : (player.ready ? 'ready' : 'not-ready')}">
                    ${isHost ? 'Host' : (player.ready ? 'Ready' : 'Not Ready')}
                </div>
                <div class="player-rank" data-playerid="${player.user._id}" data-game="${lobby.gameType}">
                    <i class="fas fa-spinner fa-spin"></i> Loading rank...
                </div>
            </div>
        `;
        
        membersList.appendChild(memberItem);
        
        // Fetch and display player rank
        fetchPlayerRank(player.user._id, lobby.gameType)
            .then(rank => {
                const rankElement = document.querySelector(`.player-rank[data-playerid="${player.user._id}"]`);
                if (rankElement) {
                    if (rank) {
                        rankElement.innerHTML = `<i class="fas fa-trophy"></i> ${formatRank(rank, lobby.gameType)}`;
                    } else {
                        rankElement.innerHTML = '<i class="fas fa-question-circle"></i> No rank';
                    }
                }
            })
            .catch(err => {
                console.error('Error fetching player rank:', err);
                const rankElement = document.querySelector(`.player-rank[data-playerid="${player.user._id}"]`);
                if (rankElement) {
                    rankElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Rank unavailable';
                }
            });
    });
    
    // Add empty slots
    for (let i = lobby.players.length; i < lobby.maxPlayers; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'member-item';
        emptySlot.innerHTML = `
            <div class="member-avatar" style="background-color: var(--gray-color);">?</div>
            <div class="member-info">
                <div class="member-name">Open Slot</div>
                <div class="member-status">Waiting for player...</div>
            </div>
        `;
        membersList.appendChild(emptySlot);
    }
}

/**
 * Set up chat functionality
 */
function setupChat(lobbyId) {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // Send message when send button is clicked
    sendButton.addEventListener('click', () => {
        sendMessage(lobbyId, chatInput.value);
    });
    
    // Send message when Enter key is pressed
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(lobbyId, chatInput.value);
        }
    });
    
    // Function to send message
    async function sendMessage(lobbyId, message) {
        if (!message.trim()) return;
        
        try {
            // Clear input
            chatInput.value = '';
            
            // Get user info
            const userInfo = getUserInfo();
            if (!userInfo) {
                showError('You must be logged in to send messages');
                return;
            }
            
            // Add message to chat (optimistic UI update)
            addMessageToChat({
                sender: userInfo.username,
                content: message,
                timestamp: new Date(),
                isCurrentUser: true
            });
            
            // Send message to server (in a real app)
            // await sendMessageToServer(lobbyId, message);
            
            // For now, we'll simulate server response
            console.log('Message sent:', message);
            
        } catch (error) {
            console.error('Error sending message:', error);
            showError('Failed to send message');
        }
    }
    
    // Function to add message to chat
    function addMessageToChat(messageData) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${messageData.isCurrentUser ? 'user-message' : 'other-message'}`;
        
        // Format timestamp
        const formattedTime = new Date(messageData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            ${!messageData.isCurrentUser ? `<div class="message-sender">${messageData.sender}</div>` : ''}
            <div class="message-content">${messageData.content}</div>
            <div class="message-time">${formattedTime}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Example: Add some test messages
    addSystemMessage('Welcome to the lobby chat! Be respectful and have fun.');
    
    // Function to add system message
    function addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system-message';
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
    }
}

/**
 * Set up event listeners for buttons
 */
function setupEventListeners(lobbyId) {
    // Host controls
    const startGameBtn = document.getElementById('start-game-btn');
    const editLobbyBtn = document.getElementById('edit-lobby-btn');
    const deleteLobbyBtn = document.getElementById('delete-lobby-btn');
    
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            // In a real app, this would start the game
            alert('Starting game... (Not implemented in this demo)');
        });
    }
    
    if (editLobbyBtn) {
        editLobbyBtn.addEventListener('click', () => {
            // Since edit-lobby.html doesn't exist, we'll create a modal to edit the lobby
            // First, get the current lobby data
            getLobbyById(lobbyId).then(response => {
                const lobby = response.data;
                
                // Create a modal for editing
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2>Edit Lobby</h2>
                        <form id="edit-lobby-form">
                            <div class="form-group">
                                <label for="lobby-name-input">Lobby Name</label>
                                <input type="text" id="lobby-name-input" value="${lobby.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="lobby-description-input">Description</label>
                                <textarea id="lobby-description-input" rows="3">${lobby.description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="max-players-input">Max Players</label>
                                <input type="number" id="max-players-input" min="2" max="10" value="${lobby.maxPlayers}" required>
                            </div>
                            <div class="form-group">
                                <label for="lobby-status-input">Status</label>
                                <select id="lobby-status-input">
                                    <option value="open" ${lobby.status === 'open' ? 'selected' : ''}>Open</option>
                                    <option value="full" ${lobby.status === 'full' ? 'selected' : ''}>Full</option>
                                    <option value="in-game" ${lobby.status === 'in-game' ? 'selected' : ''}>In Game</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Close button functionality
                const closeBtn = modal.querySelector('.close');
                closeBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
                
                // Form submission
                const form = document.getElementById('edit-lobby-form');
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const updateData = {
                        name: document.getElementById('lobby-name-input').value,
                        description: document.getElementById('lobby-description-input').value,
                        maxPlayers: parseInt(document.getElementById('max-players-input').value),
                        status: document.getElementById('lobby-status-input').value
                    };
                    
                    try {
                        await updateLobby(lobbyId, updateData);
                        document.body.removeChild(modal);
                        window.location.reload();
                    } catch (error) {
                        console.error('Error updating lobby:', error);
                        alert('Failed to update lobby: ' + error.message);
                    }
                });
            }).catch(error => {
                console.error('Error fetching lobby details:', error);
                alert('Failed to fetch lobby details for editing');
            });
        });
    }
    
    if (deleteLobbyBtn) {
        deleteLobbyBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this lobby?')) {
                try {
                    // Call the delete lobby API function
                    const userInfo = getUserInfo();
                    const token = userInfo?.token;

                    if (!token) {
                        throw new Error('Not authenticated');
                    }

                    const response = await fetch(`${window.APP_CONFIG.API_URL}/lobbies/${lobbyId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Failed to delete lobby');
                    }
                    
                    // Redirect to lobbies page after successful deletion
                    window.location.href = 'lobbies.html';
                } catch (error) {
                    console.error('Error deleting lobby:', error);
                    showError('Failed to delete lobby: ' + error.message);
                }
            }
        });
    }
    
    // Member controls
    const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
    const readyBtn = document.getElementById('ready-btn');
    
    if (leaveLobbyBtn) {
        leaveLobbyBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to leave this lobby?')) {
                try {
                    await leaveLobby(lobbyId);
                    window.location.href = 'lobbies.html';
                } catch (error) {
                    console.error('Error leaving lobby:', error);
                    showError('Failed to leave lobby');
                }
            }
        });
    }
    
    if (readyBtn) {
        readyBtn.addEventListener('click', () => {
            // Toggle ready status
            const isReady = readyBtn.classList.contains('ready');
            
            if (isReady) {
                readyBtn.classList.remove('ready');
                readyBtn.innerHTML = '<i class="fas fa-check"></i> Ready';
            } else {
                readyBtn.classList.add('ready');
                readyBtn.innerHTML = '<i class="fas fa-times"></i> Not Ready';
            }
            
            // In a real app, this would update the ready status on the server
            console.log('Ready status changed to:', !isReady);
        });
    }
}

/**
 * Join lobby handler
 */
async function joinLobbyHandler(lobbyId) {
    // Check if user is authenticated
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) {
        // Redirect to login page
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    // Check if already a member
    const joinButton = document.getElementById('join-lobby-btn');
    
    if (joinButton) {
        // Disable button and show loading state
        joinButton.disabled = true;
        joinButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
        
        try {
            // Call API to join lobby wrapped in a try/catch to get more detailed error info
            const response = await window.Lobby.joinLobby(lobbyId);
            console.log('Join lobby successful, response:', response);
            
            // Remove the join button container instead of reloading the page
            const joinButtonContainer = joinButton.parentElement;
            if (joinButtonContainer) {
                joinButtonContainer.remove();
            }
            
            // Update the lobby data
            updateLobbyDetails(response.data);
            updateMembersList(response.data);
            
            // Show ready/leave controls
            document.getElementById('member-controls')?.classList.remove('hidden');
            
            // Show notification
            showNotification('Successfully joined the lobby!', 'success');
        } catch (error) {
            console.error('Join lobby error:', error);
            
            // Reset button
            joinButton.disabled = false;
            joinButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Lobby';
            
            // Show error notification
            let errorMessage = 'Failed to join lobby';
            
            if (error.message) {
                if (error.message.includes('full')) {
                    errorMessage = 'Cannot join: Lobby is full';
                } else if (error.message.includes('already')) {
                    errorMessage = 'You are already in this lobby';
                } else if (error.message.includes('password')) {
                    errorMessage = 'Incorrect password for private lobby';
                } else {
                    errorMessage = `Error: ${error.message}`;
                }
            }
            
            showNotification(errorMessage, 'error');
        }
    }
}

/**
 * Calculate time ago string
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

/**
 * Show error message
 */
function showError(message) {
    alert(message);
}

/**
 * Get user info from localStorage
 */
function getUserInfo() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
}

/**
 * Format rank display based on game type
 */
function formatRank(rank, gameType) {
    if (!rank || rank === 'any') return 'Any';
    
    // Convert rank to proper case
    const formattedRank = rank.split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    // Special formatting for specific games
    if (gameType === 'csgo') {
        if (rank.includes('mg')) return rank.toUpperCase();
        if (rank === 'dmg') return 'DMG';
        if (rank === 'le') return 'LE';
        if (rank === 'lem') return 'LEM';
    }
    
    return formattedRank;
}

/**
 * Format region display
 */
function formatRegion(region) {
    if (!region || region === 'any') return 'Any';
    
    const regionMap = {
        'na': 'North America',
        'eu': 'Europe',
        'asia': 'Asia',
        'oceania': 'Oceania',
        'sa': 'South America'
    };
    
    return regionMap[region.toLowerCase()] || region;
}

/**
 * Format language display
 */
function formatLanguage(language) {
    if (!language || language === 'any') return 'Any';
    
    // Convert language code to proper case
    return language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

/**
 * Fetch host's rank for a specific game
 * @param {string} hostId - Host user ID
 * @param {string} gameType - Game type
 * @returns {Promise<string>} - Promise resolving to the rank
 */
async function fetchHostRank(hostId, gameType) {
    try {
        const response = await fetch(`/api/profiles/user/${hostId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch host profile');
        }
        
        const profile = await response.json();
        
        // Check if the user has a rank for the specified game
        if (profile.gameRanks && profile.gameRanks.length > 0) {
            const gameRank = profile.gameRanks.find(gr => 
                gr.game.toLowerCase() === gameType.toLowerCase());
            
            if (gameRank) {
                return gameRank.rank;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching host rank:', error);
        return null;
    }
}

/**
 * Fetch player's rank for a specific game
 * This is a duplicate of fetchHostRank but with a more generic name for clarity
 * @param {string} playerId - Player user ID
 * @param {string} gameType - Game type
 * @returns {Promise<string>} - Promise resolving to the rank
 */
async function fetchPlayerRank(playerId, gameType) {
    try {
        const response = await fetch(`/api/profiles/user/${playerId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch player profile');
        }
        
        const profile = await response.json();
        
        // Check if the user has a rank for the specified game
        if (profile.gameRanks && profile.gameRanks.length > 0) {
            const gameRank = profile.gameRanks.find(gr => 
                gr.game.toLowerCase() === gameType.toLowerCase());
            
            if (gameRank) {
                return gameRank.rank;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching player rank:', error);
        return null;
    }
}
