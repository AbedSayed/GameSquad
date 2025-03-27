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
    // Update basic lobby details
    document.getElementById('lobby-name').textContent = lobby.name;
    
    // Update status with proper styling
    const statusElement = document.getElementById('lobby-status');
    statusElement.textContent = lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1);
    statusElement.className = `lobby-status status-${lobby.status}`;
    
    // Update game icon if it exists
    const gameIcon = document.getElementById('game-icon');
    if (gameIcon && lobby.gameType) {
        gameIcon.src = `../assets/${lobby.gameType.toLowerCase()}-icon.png`;
        gameIcon.alt = lobby.gameType;
    }
    
    document.getElementById('lobby-game').textContent = lobby.game || 'Not specified';
    document.getElementById('lobby-type').textContent = lobby.type || 'Public';
    document.getElementById('lobby-host').textContent = lobby.host.username;
    document.getElementById('lobby-players-count').textContent = `${lobby.currentPlayers}/${lobby.maxPlayers}`;
    document.getElementById('lobby-region').textContent = lobby.region || 'Any';
    document.getElementById('lobby-language').textContent = lobby.language || 'Any';
    
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
            console.log('Comparing:', player.user, currentUser._id);
            return player.user._id === currentUser._id || 
                   (typeof player.user === 'string' && player.user === currentUser._id);
        });
    }
    
    console.log('User membership status:', { isCurrentUserMember, isCurrentUserHost });
    
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
            </div>
        `;
        
        membersList.appendChild(memberItem);
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
