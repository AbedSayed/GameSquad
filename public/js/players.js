// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

// Simple function to set up friend requests frame - minimal implementation
function setupFriendRequestsFrame() {
    console.log('Setting up friend requests system - using banner only');
    
    // Hide the friend requests modal box if it exists
    const friendRequestsFrame = document.getElementById('friendRequestsFrame');
    if (friendRequestsFrame) {
        friendRequestsFrame.style.display = 'none';
    }
    
    // Initialize the banner close button
    setupFriendRequestBanner();
    
    // Check for pending friend requests on load
    setTimeout(() => {
        console.log('Checking for pending friend requests on page load...');
        checkForFriendRequests();
    }, 1000);
}

// Set up the friend request banner at the top of the page
function setupFriendRequestBanner() {
    console.log('Setting up friend request banner');
    
    // Get the banner element
    const banner = document.getElementById('friendRequestBanner');
    if (!banner) {
        console.error('Friend request banner element not found');
        return;
    }
    
    // Set up close button
    const closeBtn = banner.querySelector('.close-banner-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked');
            banner.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                banner.style.display = 'none';
            }, 500);
        });
    }
    
    // Set up accept button (using default values until actual request arrives)
    const acceptBtn = banner.querySelector('.btn-success');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', function() {
            const senderId = this.dataset.senderId;
            const requestId = this.dataset.requestId;
            const senderName = this.dataset.senderName;
            
            if (!senderId || !requestId) {
                console.error('Missing data attributes on accept button');
                return;
            }
            
            console.log(`Accepting friend request: ID=${requestId}, sender=${senderId}, name=${senderName}`);
            
            // Show loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ACCEPTING...';
            this.disabled = true;
            
            // Disable decline button as well
            const declineBtn = banner.querySelector('.btn-danger');
            if (declineBtn) declineBtn.disabled = true;
            
            // Accept the friend request
            if (window.SocketHandler && typeof window.SocketHandler.acceptFriendRequest === 'function') {
                // Use SocketHandler if available
                window.SocketHandler.acceptFriendRequest(requestId, senderId, senderName);
            } else {
                // Fallback to direct accept function
                acceptFriendRequest(requestId, senderId);
            }
            
            // Close the banner after a delay
            setTimeout(() => {
                banner.style.animation = 'fadeOut 0.5s ease-out forwards';
                setTimeout(() => {
                    banner.style.display = 'none';
                }, 500);
            }, 1500);
        });
    }
    
    // Set up reject button (using default values until actual request arrives)
    const rejectBtn = banner.querySelector('.btn-danger');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            const senderId = this.dataset.senderId;
            const requestId = this.dataset.requestId;
            
            if (!senderId || !requestId) {
                console.error('Missing data attributes on reject button');
                return;
            }
            
            console.log(`Rejecting friend request: ID=${requestId}, sender=${senderId}`);
            
            // Show loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DECLINING...';
            this.disabled = true;
            
            // Disable accept button as well
            const acceptBtn = banner.querySelector('.btn-success');
            if (acceptBtn) acceptBtn.disabled = true;
            
            // Reject the friend request
            if (window.SocketHandler && typeof window.SocketHandler.rejectFriendRequest === 'function') {
                // Use SocketHandler if available
                window.SocketHandler.rejectFriendRequest(requestId, senderId);
            } else {
                // Fallback to direct reject function
                rejectFriendRequest(requestId, senderId);
            }
            
            // Close the banner after a delay
            setTimeout(() => {
                banner.style.animation = 'fadeOut 0.5s ease-out forwards';
                setTimeout(() => {
                    banner.style.display = 'none';
                }, 500);
            }, 1500);
        });
    }
    
    // Make sure we have the fadeOut animation
    ensureFadeoutAnimation();
}

// Ensure the fadeOut animation exists in the document
function ensureFadeoutAnimation() {
    if (!document.getElementById('friendRequestAnimations')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'friendRequestAnimations';
        styleEl.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(styleEl);
    }
}

// Function to clean up "Unknown User" friend requests
function cleanupUnknownUserRequests() {
    console.log('Cleaning up Unknown User friend requests...');
    
    try {
        // Get user info from localStorage
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            console.log('No user info found in localStorage');
            return;
        }
        
        const userInfo = JSON.parse(userInfoStr);
        
        // Check if we have friend requests
        if (!userInfo.friendRequests || !userInfo.friendRequests.received) {
            console.log('No friend requests found');
            return;
        }
        
        // Count initial requests
        const initialCount = userInfo.friendRequests.received.length;
        
        // Filter out Unknown User requests
        userInfo.friendRequests.received = userInfo.friendRequests.received.filter(request => {
            // Check if sender is an object with username
            const hasValidSender = request.sender && 
                typeof request.sender === 'object' && 
                request.sender.username && 
                request.sender.username !== 'Unknown User';
                
            // Or check senderName directly
            const hasValidSenderName = request.senderName && 
                request.senderName !== 'Unknown User';
                
            return hasValidSender || hasValidSenderName;
        });
        
        // Count how many were removed
        const removedCount = initialCount - userInfo.friendRequests.received.length;
        
        if (removedCount > 0) {
            console.log(`Removed ${removedCount} Unknown User friend requests`);
            
            // Save updated user info
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            // If we're using FriendsService, update it too
            if (window.FriendsService) {
                window.FriendsService.updateFriendRequests(userInfo.friendRequests);
            }
        } else {
            console.log('No Unknown User friend requests found');
        }
    } catch (error) {
        console.error('Error cleaning up Unknown User friend requests:', error);
    }
}

// Simple function to filter players - minimal implementation
function filterPlayers() {
    console.log('Filtering players');
    
    const searchInput = document.getElementById('player-search');
    const gameFilter = document.getElementById('game-filter');
    const rankFilter = document.getElementById('rank-filter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const gameType = gameFilter ? gameFilter.value : 'all';
    const rank = rankFilter ? rankFilter.value : 'all';
    
    console.log(`Filtering with search: "${searchTerm}", game: ${gameType}, rank: ${rank}`);
    
    // Simple filtering for player cards
    document.querySelectorAll('.player-card').forEach(card => {
        let shouldShow = true;
        card.style.display = shouldShow ? 'flex' : 'none';
    });
}

// Simple function to reset filters
function resetFilters() {
    console.log('Resetting filters');
    
    const searchInput = document.getElementById('player-search');
    const gameFilter = document.getElementById('game-filter');
    const rankFilter = document.getElementById('rank-filter');
    
    if (searchInput) searchInput.value = '';
    if (gameFilter) gameFilter.value = 'all';
    if (rankFilter) rankFilter.value = 'all';
    
    filterPlayers();
}

// Call this function on page load
document.addEventListener('DOMContentLoaded', function() {
    // Clean up Unknown User friend requests before checking for them
    cleanupUnknownUserRequests();
    
    // Rest of your initialization code...
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
    
    // Filter form submission
    const filterForm = document.querySelector('.filters-form');
    if (filterForm) {
        const searchBtn = filterForm.querySelector('#searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', filterPlayers);
    }
    
        // Reset filters
        const resetBtn = filterForm.querySelector('#resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetFilters);
        }
    }
    
    // Toggle filters visibility
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', function() {
            const filtersForm = document.querySelector('.filters-form');
            const isVisible = filtersForm.style.display !== 'none';
            
            filtersForm.style.display = isVisible ? 'none' : 'grid';
            this.querySelector('span').textContent = isVisible ? 'Show Filters' : 'Hide Filters';
        });
    }
    
    // Close friend requests frame
    const closeBtn = document.getElementById('closeFriendRequests');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const frame = document.getElementById('friendRequestsFrame');
            if (frame) {
                frame.style.display = 'none';
            }
        });
    }
    
    // Set up Add Friend buttons
    setupAddFriendButtons();
    
    // Refresh friend status to update all UI elements
    setTimeout(() => {
        console.log('Running friend status refresh after page load...');
        refreshFriendStatus();
    }, 500);
    
    // Load friends list in the friend request frame
    setTimeout(() => {
        console.log('Running delayed friend list load');
        
        // First ensure the friend requests frame is visible and initialized
        const friendRequestsFrame = document.getElementById('friendRequestsFrame');
        if (!friendRequestsFrame || friendRequestsFrame.style.display === 'none') {
            console.log('Friend requests frame not found or not visible yet, will initialize it first');
            // Show the friend request frame to initialize it
            showFriendRequestFrame();
            
            // Then wait a bit and try again to load friends
            setTimeout(loadFriendsList, 500);
            return;
        }
        
        // If frame is visible, try to load friends
        loadFriendsList();
        
        // Now check if we can find the tabs
        const friendsTab = document.querySelector('.frame-tab[data-tab="friends"]');
        const requestsTab = document.querySelector('.frame-tab[data-tab="requests"]');
        
        if (friendsTab && requestsTab) {
            console.log('Found friend tabs, will click them to initialize');
            
            // Click friends tab first to initialize it
            friendsTab.click();
            
            // Then click back to requests tab
            setTimeout(() => {
                    requestsTab.click();
            }, 200);
        } else {
            console.log('Could not find friend tabs, will try to initialize the structure');
            // Try to directly initialize the structure
            const frame = document.getElementById('friendRequestsFrame');
            if (frame) {
                // Use our global helper function
                console.log('Using global ensureFriendTabsExist function');
                    ensureFriendTabsExist(frame);
                
                // Try to click the tabs again after creating structure
                setTimeout(() => {
                    const newFriendsTab = document.querySelector('.frame-tab[data-tab="friends"]');
                    const newRequestsTab = document.querySelector('.frame-tab[data-tab="requests"]');
                    
                    if (newFriendsTab) {
                        console.log('Found friends tab after creating structure, clicking it');
                        newFriendsTab.click();
                        
                        if (newRequestsTab) {
                            setTimeout(() => {
                                console.log('Clicking back to requests tab');
                                newRequestsTab.click();
            }, 200);
                        }
                    }
                }, 300);
            }
        }
    }, 1000);
    
    console.log('Event listeners setup complete');
}

// Setup event listeners for Add Friend buttons
function setupAddFriendButtons() {
    console.log('Setting up add friend buttons');
    const addFriendButtons = document.querySelectorAll('.add-friend-btn');
    console.log(`Found ${addFriendButtons.length} add friend buttons`);
    
    addFriendButtons.forEach(button => {
        button.removeEventListener('click', handleAddFriendClick);
        button.addEventListener('click', handleAddFriendClick);
    });
}

// Handle Add Friend button click
function handleAddFriendClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const playerId = button.dataset.id;
    const playerName = button.dataset.name || 'Player';
    
    console.log(`Add friend button clicked for player: ${playerId} (${playerName})`);
    
    // Disable the button to prevent multiple clicks
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    // Call the addFriend function
    addFriend(playerId, playerName)
        .then(() => {
            console.log(`Friend request sent to ${playerName}`);
            // Immediately update the UI for this player
            updateFriendButtonUI(playerId, playerName, 'pending-sent');
        })
        .catch(error => {
            console.error(`Error adding friend ${playerName}:`, error);
            // Re-enable the button
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Add';
            
            // Show error notification
            if (typeof showNotification === 'function') {
                showNotification('Error', `Failed to send friend request to ${playerName}. Please try again.`, 'error');
            }
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

/**
 * Shows a loading indicator while players are being loaded
 */
function showLoadingIndicator() {
    // Create or show loading indicator
    let loadingIndicator = document.getElementById('loadingIndicator');
    
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p>Loading players...</p>
        `;
        
        // Add the loading indicator to the page
        const playersContainer = document.getElementById('playersContainer');
        if (playersContainer) {
            playersContainer.innerHTML = '';
            playersContainer.appendChild(loadingIndicator);
        } else {
            document.body.appendChild(loadingIndicator);
        }
    } else {
        loadingIndicator.style.display = 'flex';
    }
}

/**
 * Hides the loading indicator when players are loaded
 */
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    console.error(message);
    
    // Create error notification
    if (typeof showNotification === 'function') {
        // Use existing showNotification if available
        showNotification('Error', message, 'error');
    } else {
        // Create a simple error message if showNotification isn't available
        let errorMessage = document.getElementById('errorMessage');
        
        if (!errorMessage) {
            errorMessage = document.createElement('div');
            errorMessage.id = 'errorMessage';
            errorMessage.className = 'error-message';
            
            // Style the error message
            errorMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
            errorMessage.style.color = 'white';
            errorMessage.style.padding = '15px';
            errorMessage.style.borderRadius = '5px';
            errorMessage.style.margin = '15px 0';
            errorMessage.style.boxShadow = '0 0 15px rgba(220, 53, 69, 0.3)';
            errorMessage.style.position = 'relative';
            errorMessage.style.animation = 'fadeIn 0.3s';
            
            // Add a close button
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '10px';
            closeButton.style.top = '10px';
            closeButton.style.background = 'none';
            closeButton.style.border = 'none';
            closeButton.style.color = 'white';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = () => errorMessage.style.display = 'none';
            
            errorMessage.appendChild(closeButton);
            
            // Add the error icon and message
            const content = document.createElement('div');
            content.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right: 10px;"></i>${message}`;
            errorMessage.appendChild(content);
            
            // Add to the page
            const playersContainer = document.getElementById('playersContainer');
            if (playersContainer) {
                playersContainer.prepend(errorMessage);
            } else {
                document.body.appendChild(errorMessage);
            }
        } else {
            // Update existing error message
            const content = errorMessage.querySelector('div');
            if (content) {
                content.innerHTML = `<i class="fas fa-exclamation-circle" style="margin-right: 10px;"></i>${message}`;
            }
            errorMessage.style.display = 'block';
        }
    }
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
    
    // Check friend status - properly get the result object
    const friendStatusResult = checkIfFriend(player._id);
    const friendStatus = friendStatusResult.status;
    console.log(`Creating card for ${player._id} with friend status: ${friendStatus}`);
    
    let friendBtnHtml = '';
    
    if (friendStatus === 'friend') {
        // Already friends
        friendBtnHtml = `<button class="btn btn-success friend-button" data-id="${player._id}">
            <i class="fas fa-check"></i> Friend
        </button>`;
    } else if (friendStatus === 'pending-sent') {
        // Request pending
        friendBtnHtml = `<button class="btn btn-secondary friend-pending" data-id="${player._id}" disabled>
            <i class="fas fa-clock"></i> Pending
        </button>`;
    } else {
        // Not friends yet
        friendBtnHtml = `<button class="btn btn-primary add-friend-btn" data-id="${player._id}">
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
        return Promise.reject(new Error('Not logged in'));
    }
    
    console.log(`Adding friend: ${playerName} (${playerId})`);
    
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
            updateFriendButtonUI(playerId, playerName, 'pending-sent');
            showNotification(`Friend request sent to ${playerName}!`, 'success');
            
            return result;
        }
        
        // Get current user info
        const currentUser = getCurrentUser();
        if (!currentUser || !currentUser._id) {
            showNotification('User information not found', 'error');
            return Promise.reject(new Error('User information not found'));
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
            const requestId = responseData.data?._id || responseData._id || `temp-${Date.now()}`;
            
            // Update the local user info to reflect the sent request
            updateFriendRequestInLocalStorage(playerId, playerName, requestId);
            
            // Show success notification
            showNotification(`Friend request sent to ${playerName}!`, 'success');
            
            return responseData;
                } else {
            // Handle error response
            const errorMessage = responseData.message || 'Failed to send friend request';
            showNotification(errorMessage, 'error');
            return Promise.reject(new Error(errorMessage));
        }
    } catch (error) {
        console.error('Error adding friend:', error);
        showNotification(`Error: ${error.message || 'Failed to send friend request'}`, 'error');
        return Promise.reject(error);
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

// Function to update friend button UI based on friend status
function updateFriendButtonUI(playerId, playerName, status) {
    if (!playerId) {
        console.error('[players.js] Cannot update friend button UI: No player ID provided');
        return;
    }
    
    // If status is null, perform a fresh check
    if (status === null) {
        const friendStatus = checkIfFriend(playerId);
        status = friendStatus.status;
    }
    
    console.log(`[players.js] Updating UI for player ${playerId} to status: ${status}`);
    
    // Find all player cards for this player (there might be multiple instances)
    const playerCards = document.querySelectorAll(`.player-card[data-player-id="${playerId}"]`);
    
    if (playerCards.length === 0) {
        console.log(`[players.js] No player cards found for ID: ${playerId}`);
    }
    
    playerCards.forEach(card => {
        // Find friend action container (within the player actions section)
        const playerActions = card.querySelector('.player-actions');
        if (!playerActions) {
            console.log(`[players.js] No player actions found in card for ID: ${playerId}`);
            return;
        }
        
        // Clear previous buttons related to friend status
        const oldFriendButtons = playerActions.querySelectorAll('.friend-button, .add-friend-btn, .add-friend, .friend-pending, .friend-status');
        oldFriendButtons.forEach(btn => btn.remove());
        
        // Create new button based on status
        let button;
        
        if (status === 'friend') {
            // Already friends - show friend status and remove option
            button = document.createElement('button');
            button.className = 'btn btn-success friend-button';
            button.dataset.id = playerId;
            button.dataset.name = playerName;
            button.innerHTML = '<i class="fas fa-check"></i> FRIEND';
        } else if (status === 'pending-sent') {
            // We sent a request - show pending
            button = document.createElement('button');
            button.className = 'btn btn-secondary friend-pending';
            button.dataset.id = playerId;
            button.dataset.name = playerName;
            button.innerHTML = '<i class="fas fa-clock"></i> PENDING';
            button.disabled = true;
        } else if (status === 'pending-received') {
            // We received a request - show accept/decline options
            button = document.createElement('div');
            button.className = 'friend-request-actions';
            button.innerHTML = `
                <button class="btn btn-success accept-request" data-id="${playerId}" data-name="${playerName}">
                    <i class="fas fa-check"></i> ACCEPT
                </button>
                <button class="btn btn-danger decline-request" data-id="${playerId}" data-name="${playerName}">
                    <i class="fas fa-times"></i> DECLINE
                </button>
            `;
        } else {
            // Not friends - show add friend option
            button = document.createElement('button');
            button.className = 'btn btn-primary add-friend-btn';
            button.dataset.id = playerId;
            button.dataset.name = playerName;
            button.innerHTML = '<i class="fas fa-user-plus"></i> ADD';
        }
        
        // Add to player actions
        playerActions.appendChild(button);
    });
    
    // Re-attach event listeners
    setupAddFriendButtons();
}

// Function to check if a player is a friend
function checkIfFriend(playerId) {
    console.log(`[players.js] Checking friend status for player ${playerId}`);
    
    // Get user info from local storage
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
        console.log('[players.js] No user info found in localStorage');
        return { status: 'not-friend' };
    }
    
    try {
        const userInfo = JSON.parse(userInfoStr);
        console.log('[players.js] User info from localStorage:', userInfo);
        
        // Make sure we have the required properties
        if (!userInfo.friends) userInfo.friends = [];
        if (!userInfo.friendRequests) userInfo.friendRequests = { sent: [], received: [] };
        
        console.log(`[players.js] User friends array:`, userInfo.friends);
        console.log(`[players.js] User friendsData:`, userInfo.friendsData || 'Not present');
        
        // Check if we are already friends using the main friends array
        if (userInfo.friends && Array.isArray(userInfo.friends)) {
            // Convert all IDs to strings to ensure consistent comparison
            const friendIds = userInfo.friends.map(id => String(id));
            if (friendIds.includes(String(playerId))) {
                console.log(`[players.js] Player ${playerId} is found in friends array`);
            return { status: 'friend' };
            }
        }
        
        // Check if we are already friends using the friendsData object (if available)
        if (userInfo.friendsData && Array.isArray(userInfo.friendsData)) {
            const isFriend = userInfo.friendsData.some(friend => {
                const friendId = String(friend._id || friend.id || friend.userId || '');
                return friendId === String(playerId);
            });
            
            if (isFriend) {
                console.log(`[players.js] Player ${playerId} is found in friendsData array`);
                return { status: 'friend' };
            }
        }
        
        // Check if we have a separate friends item in localStorage
        const friendsStr = localStorage.getItem('friends');
        if (friendsStr) {
            try {
                const friendsData = JSON.parse(friendsStr);
                if (Array.isArray(friendsData)) {
                    const isFriend = friendsData.some(friend => {
                        const friendId = String(friend._id || friend.id || friend.userId || '');
                        return friendId === String(playerId);
                    });
                    
                    if (isFriend) {
                        console.log(`[players.js] Player ${playerId} is found in separate friends storage`);
                        return { status: 'friend' };
                    }
                }
            } catch (e) {
                console.error('[players.js] Error parsing friends from localStorage:', e);
            }
        }
        
        // Check if we have a pending sent request to this player
        if (userInfo.friendRequests && userInfo.friendRequests.sent) {
            // Find any request where the recipient is this player
            const sentRequest = userInfo.friendRequests.sent.find(req => {
                // Handle both object and string IDs
                const recipientId = typeof req.recipient === 'object' 
                    ? req.recipient.toString() 
                    : String(req.recipient);
                
                return recipientId === String(playerId) && req.status === 'pending';
            });
            
            if (sentRequest) {
                console.log(`[players.js] Found pending sent request to player ${playerId}`);
                return { 
                    status: 'pending-sent',
                    requestId: sentRequest._id 
                };
            }
        }
        
        // Check if we have a pending received request from this player
        if (userInfo.friendRequests && userInfo.friendRequests.received) {
            // Find any request where the sender is this player
            const receivedRequest = userInfo.friendRequests.received.find(req => {
                // Handle both object and string IDs
                const senderId = typeof req.sender === 'object' 
                    ? req.sender.toString() 
                    : String(req.sender);
                
                return senderId === String(playerId) && req.status === 'pending';
            });
            
            if (receivedRequest) {
                console.log(`[players.js] Found pending received request from player ${playerId}`);
                return { 
                    status: 'pending-received',
                    requestId: receivedRequest._id 
                };
            }
        }
        
        // If we reach here, we are not friends
        console.log(`[players.js] Player ${playerId} is not a friend (not found in any lists)`);
        return { status: 'not-friend' };
        
    } catch (error) {
        console.error('[players.js] Error checking friend status:', error);
        return { status: 'not-friend' };
    }
}

// Function to refresh friend status for all player cards
function refreshFriendStatus() {
    console.log('[players.js] Refreshing friend status for all player cards');
    
    // Find all player cards
    const playerCards = document.querySelectorAll('.player-card');
    playerCards.forEach(card => {
        // Changed from data-id to data-player-id to match what's set in createPlayerCard
        const playerId = card.getAttribute('data-player-id');
        // Try to get player name from card
        const playerNameEl = card.querySelector('.player-name');
        const playerName = playerNameEl ? playerNameEl.textContent : 'Unknown';
        
        if (!playerId) return;
        
        console.log(`Refreshing friend status for player: ${playerId} (${playerName})`);
        
        // Get current friend status
        const friendStatus = checkIfFriend(playerId);
        console.log(`Friend status for ${playerId}: ${friendStatus.status}`);
        
        // Update the UI based on the status
        updateFriendButtonUI(playerId, playerName, friendStatus.status);
    });
    
    // Fetch the latest friend data
    if (window.FriendsService && typeof window.FriendsService.loadFriendRequests === 'function') {
        window.FriendsService.loadFriendRequests();
    }
    
    // Set up event listeners for friend-related events
    setupFriendEventListeners();
}

// Global queue for pending friend requests
let pendingFriendRequestsQueue = [];
let isProcessingRequestQueue = false;

// Check for friend requests and display them in the banner
function checkForFriendRequests() {
    console.log('Checking for friend requests...');
    
    try {
        // Get user info from localStorage
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            console.log('No user info found in localStorage');
            return [];
        }
        
        const userInfo = JSON.parse(userInfoStr);
        if (!userInfo.friendRequests || !userInfo.friendRequests.received || !userInfo.friendRequests.received.length) {
            console.log('No friend requests found in user info');
            return [];
        }
        
        console.log(`Found ${userInfo.friendRequests.received.length} friend requests in localStorage`);
        
        // Filter to only show pending requests
        const pendingRequests = userInfo.friendRequests.received.filter(request => 
            !request.status || request.status === 'pending'
        );
        
        console.log(`Found ${pendingRequests.length} pending friend requests`);
        
        if (pendingRequests.length > 0) {
            // Clear the previous queue
            pendingFriendRequestsQueue = [];
            
            // Process each pending request and add to queue
            pendingRequests.forEach(request => {
                // Prepare the request data
                const requestData = {
                    requestId: request._id,
                    senderId: request.sender && request.sender._id ? request.sender._id : request.sender,
                    senderName: request.senderName || (request.sender && request.sender.username) || 'User',
                    message: request.message || null
                };
                
                // Add to our processing queue
                pendingFriendRequestsQueue.push(requestData);
            });
            
            // Process the first request in the queue
            processNextFriendRequest();
        }
        
        return pendingRequests;
    } catch (error) {
        console.error('Error checking for friend requests:', error);
        return [];
    }
}

// Process the next friend request in the queue
function processNextFriendRequest() {
    if (isProcessingRequestQueue || pendingFriendRequestsQueue.length === 0) {
        return;
    }
    
    isProcessingRequestQueue = true;
    
    // Get the next request
    const nextRequest = pendingFriendRequestsQueue.shift();
    
    console.log('Processing next friend request in queue:', nextRequest);
    
    // Display the request in the banner
    displayFriendRequestInBanner(nextRequest);
    
    // Set up listeners for this request's completion
    setupFriendRequestCompletion();
}

// Set up listener for friend request completion
function setupFriendRequestCompletion() {
    // Get the banner element
    const banner = document.getElementById('friendRequestBanner');
    if (!banner) {
        console.error('Friend request banner not found for completion setup');
        isProcessingRequestQueue = false;
        return;
    }
    
    // Create a completion function for when this request is handled
    const completionHandler = () => {
        console.log('Friend request handled, processing next in queue');
        
        // Small delay before processing the next request
        setTimeout(() => {
            isProcessingRequestQueue = false;
            
            // Process the next request if any
            if (pendingFriendRequestsQueue.length > 0) {
                processNextFriendRequest();
            }
        }, 2000);
    };
    
    // Add one-time event listeners to all action buttons
    const acceptBtn = banner.querySelector('.btn-success');
    const rejectBtn = banner.querySelector('.btn-danger');
    const closeBtn = banner.querySelector('.close-banner-btn');
    
    if (acceptBtn) {
        const originalClick = acceptBtn.onclick;
        acceptBtn.onclick = function(e) {
            if (originalClick) originalClick.call(this, e);
            completionHandler();
        };
    }
    
    if (rejectBtn) {
        const originalClick = rejectBtn.onclick;
        rejectBtn.onclick = function(e) {
            if (originalClick) originalClick.call(this, e);
            completionHandler();
        };
    }
    
    if (closeBtn) {
        const originalClick = closeBtn.onclick;
        closeBtn.onclick = function(e) {
            if (originalClick) originalClick.call(this, e);
            completionHandler();
        };
    }
}

// Modify showFriendRequestFrame to be empty since we're not using the modal box anymore
function showFriendRequestFrame(data) {
    console.log('Friend request modal box is deprecated, using banner notifications only');
    
    // If data is provided, add the friend request to the banner
    if (data) {
        displayFriendRequestInBanner(data);
    }
}

// Function to load and display friends list
function loadFriendsList() {
    console.log('===== LOADING FRIENDS LIST =====');
    
    // First ensure the friend requests frame is visible
    const friendRequestsFrame = document.getElementById('friendRequestsFrame');
    if (!friendRequestsFrame) {
        console.error('Friend requests frame not found');
        return;
    }
    
    // Make sure the frame is visible
    friendRequestsFrame.style.display = 'block';
    
    // Ensure the tab structure exists using the global helper
    ensureFriendTabsExist(friendRequestsFrame);
    
    // Now try to find the friends list container
    let friendsList = document.getElementById('friendsList');
    if (!friendsList) {
        console.log('Friends list container not found - creating it now');
        
        // Try to find the friends tab content first
        const friendsTab = document.getElementById('friends-tab');
        if (friendsTab) {
            console.log('Found friends tab, creating friendsList container inside it');
            friendsList = document.createElement('div');
            friendsList.id = 'friendsList';
            friendsTab.appendChild(friendsList);
        } else {
            // If we can't find the friends tab, create the entire structure
            console.log('Could not find friends-tab element, recreating the entire structure');
            
            // Create full tab structure using our global helpers
            createTabContentContainers(friendRequestsFrame);
            
            // Now try to find the friends list container again
            friendsList = document.getElementById('friendsList');
            if (!friendsList) {
                console.error('Critical error: Still could not create friendsList element');
                return;
            }
        }
    }
    
    // Show loading state
    friendsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading friends...</p>
        </div>
    `;
    
    console.log('Friends list container found, attempting to load friends...');
    
    // Helper function to create and show the empty friends list message
    function showEmptyFriendsList() {
        console.log('Showing empty friends list message');
        if (!friendsList) return;
        
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-friends-message';
        emptyMessage.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends"></i>
                <p>You don't have any friends yet</p>
                <p class="suggestion">Find players and send friend requests to add friends</p>
            </div>
        `;
        
        friendsList.innerHTML = '';
        friendsList.appendChild(emptyMessage);
    }
    
    // Helper function to load friends data
    function loadFriendsData() {
        // Main approach: Try FriendsService
        if (window.FriendsService) {
            console.log('Using FriendsService to load friends');
            
            try {
                // First try to load from current data
                let friends = window.FriendsService.getAllFriends();
                
                if (friends && Array.isArray(friends) && friends.length > 0) {
                    console.log('Found friends in FriendsService:', friends);
                    displayFriendsList(friends);
                    return;
                } else {
                    console.log('No friends found in FriendsService current data, will try to refresh');
                }
                
                // If no friends in current data, force a refresh
                window.FriendsService.loadFriends()
                    .then(friends => {
                        console.log('Loaded friends from FriendsService API:', friends);
                        if (friends && friends.length > 0) {
                            displayFriendsList(friends);
                        } else {
                            console.log('No friends returned from FriendsService API, trying localStorage');
                            loadFriendsFromLocalStorage();
                        }
                    })
                    .catch(error => {
                        console.error('Error loading friends from FriendsService:', error);
                        loadFriendsFromLocalStorage();
                    });
            } catch (error) {
                console.error('Exception using FriendsService:', error);
                loadFriendsFromLocalStorage();
            }
        } else {
            console.log('FriendsService not available, falling back to localStorage');
            loadFriendsFromLocalStorage();
        }
    }
    
    // Start loading friends data
    loadFriendsData();
    
    // Continue with the existing code for loadFriendsFromLocalStorage and displayFriendsList...
}

// Function to display the friends list
function displayFriendsList(friends) {
    console.log('Displaying friends list with data:', friends);
    
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) {
        console.error('Cannot display friends - friendsList container not found');
        return;
    }
    
    // Clear the container
    friendsList.innerHTML = '';
    
    // If no friends, show empty state
    if (!friends || friends.length === 0) {
        console.log('No friends to display, showing empty state');
        friendsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends"></i>
                <p>No friends yet</p>
            </div>
        `;
        return;
    }
    
    try {
        console.log(`Creating UI for ${friends.length} friends`);
    
    // Create a styled container for friends
    const friendsContainer = document.createElement('div');
    friendsContainer.className = 'friends-list-container';
    
    // Add each friend to the list
    friends.forEach(friend => {
            if (!friend) {
                console.warn('Skipping undefined friend in list');
                return;
            }
            
            try {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
                friendItem.dataset.id = friend._id || 'unknown';
        
        // Determine friend name
        const friendName = friend.username || 'Unknown User';
                console.log(`Creating friend item for: ${friendName}`);
        
        // Determine status (default to offline)
        const statusClass = (friend.isOnline || friend.profile?.isOnline) ? 'online' : 'offline';
        
        // Create avatar with first letter of username
        const avatarLetter = (friendName && friendName[0]) ? friendName[0].toUpperCase() : '?';
        
        // Create the friend item
        friendItem.innerHTML = `
            <div class="friend-avatar">
                <div class="avatar-placeholder">${avatarLetter}</div>
            </div>
            <div class="friend-info">
                <div class="friend-name">${friendName}</div>
                <div class="friend-status ${statusClass}">
                    <i class="fas fa-circle"></i> ${statusClass === 'online' ? 'Online' : 'Offline'}
                </div>
            </div>
            <div class="friend-actions">
                        <button class="btn btn-primary message-friend" data-id="${friend._id || 'unknown'}" data-name="${friendName}">
                    <i class="fas fa-comment"></i> Message
                </button>
                        <button class="btn btn-danger remove-friend" data-id="${friend._id || 'unknown'}" data-name="${friendName}">
                    <i class="fas fa-user-minus"></i>
                </button>
            </div>
        `;
        
        friendsContainer.appendChild(friendItem);
            } catch (itemError) {
                console.error('Error creating friend item:', itemError, friend);
            }
    });
    
    // Add the friends container to the list
    friendsList.appendChild(friendsContainer);
        console.log('Successfully added friends to container');
    
    // Add event listeners to the friend action buttons
        setupFriendItemButtons(friendsList);
    } catch (error) {
        console.error('Error displaying friends list:', error);
        friendsList.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error displaying friends</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
    }
    
    // Helper function to setup button event listeners
    function setupFriendItemButtons(container) {
        try {
            container.querySelectorAll('.message-friend').forEach(btn => {
        btn.addEventListener('click', () => {
            const friendId = btn.dataset.id;
            const friendName = btn.dataset.name;
            window.location.href = `/pages/messages.html?friend=${friendId}`;
        });
    });
    
            container.querySelectorAll('.remove-friend').forEach(btn => {
        btn.addEventListener('click', async () => {
            const friendId = btn.dataset.id;
            const friendName = btn.dataset.name;
            
            if (confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
                try {
                    if (window.FriendsService) {
                        await window.FriendsService.removeFriend(friendId);
                    } else {
                        // Fallback to direct API call
                        const token = localStorage.getItem('token');
                                if (!token) throw new Error('Not authenticated');
                        
                        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                        const response = await fetch(`${apiUrl}/friends/${friendId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                                if (!response.ok) throw new Error('Failed to remove friend');
                        }
                        
                            // Update UI
                            loadFriendsList();
                            if (typeof refreshFriendStatus === 'function') {
                            refreshFriendStatus();
                    }
                } catch (error) {
                    console.error('Error removing friend:', error);
                    showNotification('Error', `Failed to remove friend: ${error.message}`, 'error');
                }
            }
        });
    });
            
            console.log('Friend action buttons set up successfully');
        } catch (error) {
            console.error('Error setting up friend action buttons:', error);
        }
    }
}

// Add styles for the friends list to the page
function addFriendsListStyles() {
    // Check if styles already added
    if (document.getElementById('friend-frame-styles')) return;
    
    // Create style element
    const styleEl = document.createElement('style');
    styleEl.id = 'friend-frame-styles';
    styleEl.textContent = `
        .frame-tabs {
            display: flex;
            border-bottom: 1px solid rgba(108, 92, 231, 0.2);
            margin-bottom: 10px;
        }
        
        .frame-tab {
            padding: 8px 15px;
            cursor: pointer;
            opacity: 0.7;
            transition: all 0.3s;
            border-bottom: 2px solid transparent;
        }
        
        .frame-tab:hover {
            opacity: 1;
            background-color: rgba(108, 92, 231, 0.1);
        }
        
        .frame-tab.active {
            opacity: 1;
            border-bottom: 2px solid var(--primary-color);
            font-weight: bold;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        .refresh-btn {
            padding: 5px 10px;
            background-color: rgba(108, 92, 231, 0.2);
            border: 1px solid rgba(108, 92, 231, 0.3);
            border-radius: 4px;
            color: white;
            cursor: pointer;
            transition: all 0.3s;
            margin-left: auto;
        }
        
        .refresh-btn:hover {
            background-color: rgba(108, 92, 231, 0.4);
        }
        
        .friends-list-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .friend-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-radius: 5px;
            background-color: rgba(15, 15, 25, 0.7);
            border: 1px solid rgba(108, 92, 231, 0.2);
            transition: all 0.3s;
        }
        
        .friend-item:hover {
            transform: translateY(-2px);
            background-color: rgba(20, 20, 30, 0.8);
            box-shadow: 0 5px 15px rgba(108, 92, 231, 0.2);
        }
        
        .friend-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            margin-right: 10px;
            background-color: rgba(108, 92, 231, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .avatar-placeholder {
            font-size: 20px;
            font-weight: bold;
            color: white;
        }
        
        .friend-info {
            flex: 1;
        }
        
        .friend-name {
            font-weight: bold;
            margin-bottom: 3px;
        }
        
        .friend-status {
            font-size: 0.8rem;
            opacity: 0.7;
        }
        
        .friend-status.online {
            color: #4cd137;
        }
        
        .friend-status.offline {
            color: #718093;
        }
        
        .friend-actions {
            display: flex;
            gap: 5px;
        }
        
        .friend-actions .btn {
            padding: 5px 10px;
            font-size: 0.8rem;
            white-space: nowrap;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    
    document.head.appendChild(styleEl);
}

// Call this when the page loads to add the styles
document.addEventListener('DOMContentLoaded', addFriendsListStyles);

// Modify addFriendRequestToFrame to handle undefined data
function addFriendRequestToFrame(data) {
    console.log('Adding friend request to frame:', data);
    
    // If no data provided, just return without error
    if (!data) {
        console.log('No friend request data provided, skipping');
        return;
    }
    
    // Display the request in the banner at the top of the page
    displayFriendRequestInBanner(data);
    
    // No longer adding to the legacy frame as requested
}

// Display friend request in the banner at the top of the page
function displayFriendRequestInBanner(data) {
    console.log('Displaying friend request in top banner:', data);
    
    const senderId = data.senderId;
    const senderName = data.senderName || 'Unknown User';
    const message = data.message || `${senderName} would like to be your friend!`;
    const requestId = data.requestId || `local_${Date.now()}`;
    
    // Get or create the friend request banner
    let banner = document.getElementById('friendRequestBanner');
    if (!banner) {
        console.log('Friend request banner not found, creating it');
        banner = document.createElement('div');
        banner.id = 'friendRequestBanner';
        banner.className = 'friend-request-banner';
        
        // Add it to the top of the page, before the main content
        const playersContainer = document.querySelector('.players-container');
        if (playersContainer) {
            playersContainer.parentNode.insertBefore(banner, playersContainer);
        } else {
            // If no players container, add it to the body
            document.body.prepend(banner);
        }
    }
    
    // Create or update the content of the banner
    const senderInitial = senderName ? senderName.charAt(0).toUpperCase() : 'U';
    
    // Update HTML
    banner.innerHTML = `
        <div class="request-content">
            <div class="request-avatar">${senderInitial}</div>
            <div class="request-info">
                <h3 class="request-title">Friend Request</h3>
                <p class="request-message">${message}</p>
            </div>
        </div>
        <div class="request-actions">
            <button class="btn btn-success accept-request-btn" data-sender-id="${senderId}" data-request-id="${requestId}" data-sender-name="${senderName}">
                ACCEPT
            </button>
            <button class="btn btn-danger reject-request-btn" data-sender-id="${senderId}" data-request-id="${requestId}" data-sender-name="${senderName}">
                DECLINE
            </button>
        </div>
        <button class="close-banner-btn" aria-label="Close">×</button>
    `;
    
    // Or update the default buttons with data attributes
    const defaultAcceptBtn = document.getElementById('acceptFriendRequest');
    const defaultRejectBtn = document.getElementById('rejectFriendRequest');
    
    if (defaultAcceptBtn) {
        defaultAcceptBtn.dataset.senderId = senderId;
        defaultAcceptBtn.dataset.requestId = requestId;
        defaultAcceptBtn.dataset.senderName = senderName;
    }
    
    if (defaultRejectBtn) {
        defaultRejectBtn.dataset.senderId = senderId;
        defaultRejectBtn.dataset.requestId = requestId;
        defaultRejectBtn.dataset.senderName = senderName;
    }
    
    // Make sure the banner is visible
    banner.style.display = 'flex';
    banner.style.animation = 'slideInDown 0.5s ease-out';
    
    // Add event listeners to the buttons
    const acceptBtn = banner.querySelector('.accept-request-btn');
    const rejectBtn = banner.querySelector('.reject-request-btn');
    const closeBtn = banner.querySelector('.close-banner-btn');
    
    acceptBtn.addEventListener('click', () => {
        console.log('Accept button clicked in banner');
        const senderId = acceptBtn.dataset.senderId;
        const requestId = acceptBtn.dataset.requestId;
        const senderName = acceptBtn.dataset.senderName;
        
        // Show loading state
        acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ACCEPTING...';
        acceptBtn.disabled = true;
        rejectBtn.disabled = true;
        
        if (window.SocketHandler && typeof window.SocketHandler.acceptFriendRequest === 'function') {
            // Use SocketHandler if available
            window.SocketHandler.acceptFriendRequest(requestId, senderId, senderName);
        } else {
            // Fallback to direct accept function
            acceptFriendRequest(requestId, senderId);
        }
        
        // Close the banner after a delay
        setTimeout(() => {
            banner.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                banner.remove();
            }, 500);
        }, 1500);
    });
    
    rejectBtn.addEventListener('click', () => {
        console.log('Reject button clicked in banner');
        const senderId = rejectBtn.dataset.senderId;
        const requestId = rejectBtn.dataset.requestId;
        
        // Show loading state
        rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DECLINING...';
        rejectBtn.disabled = true;
        acceptBtn.disabled = true;
        
        if (window.SocketHandler && typeof window.SocketHandler.rejectFriendRequest === 'function') {
            // Use SocketHandler if available
            window.SocketHandler.rejectFriendRequest(requestId, senderId);
        } else {
            // Fallback to direct reject function
            rejectFriendRequest(requestId, senderId);
        }
        
        // Close the banner after a delay
        setTimeout(() => {
            banner.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                banner.remove();
            }, 500);
        }, 1500);
    });
    
    closeBtn.addEventListener('click', () => {
        console.log('Close button clicked in banner');
        banner.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => {
            banner.remove();
        }, 500);
    });
    
    // Add fadeOut animation to CSS if it doesn't exist
    ensureFadeoutAnimation();
}

/**
 * Accept friend request fallback function if SocketHandler is not available
 */
function acceptFriendRequest(requestId, senderId) {
    console.log(`[players.js] Accepting friend request ${requestId} from ${senderId}`);
    
    // Show loading overlay
    const overlayId = showLoadingOverlay('Accepting friend request...');
    
    // Get the API URL from config
    const apiUrl = window.APP_CONFIG?.API_URL || '/api';
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        hideLoadingOverlay(overlayId);
        showToast('error', 'Authentication required', 'Please log in to accept friend requests');
        return;
    }
    
    // Get current user info for socket events
    let currentUserId = null;
    try {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            currentUserId = userInfo._id;
        }
    } catch (err) {
        console.error('[players.js] Error getting current user ID:', err);
    }
    
    // Call API to accept friend request
    fetch(`${apiUrl}/friends/requests/${requestId}/accept`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        console.log(`[players.js] Accept friend request response status: ${response.status}`);
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('[players.js] Accept friend request response:', data);
        
        if (data.success) {
            // Update userInfo in localStorage to add the new friend
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    
                    // Add to friends list if not already there
                    if (!userInfo.friends.includes(senderId)) {
                        userInfo.friends.push(senderId);
                    }
                    
                    // Store sender details in friendsData if available
                    if (data.data && data.data.senderDetails) {
                        if (!userInfo.friendsData) {
                            userInfo.friendsData = [];
                        }
                        
                        // Check if we already have this friend in friendsData
                        const existingIndex = userInfo.friendsData.findIndex(f => f._id === senderId);
                        
                        if (existingIndex >= 0) {
                            // Update existing entry
                            userInfo.friendsData[existingIndex] = data.data.senderDetails;
                        } else {
                            // Add new entry
                            userInfo.friendsData.push(data.data.senderDetails);
                        }
                    }
                    
                    // Remove from received friend requests
                    if (userInfo.friendRequests && userInfo.friendRequests.received) {
                        userInfo.friendRequests.received = userInfo.friendRequests.received.filter(
                            req => req._id !== requestId
                        );
                    }
                    
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));
                    
                    // Emit socket events to notify both sides of the acceptance
                    if (window.socket) {
                        console.log('[players.js] Emitting friend-request-accepted socket event');
                        
                        // Notify the sender that their request was accepted
                        window.socket.emit('friend-request-accepted', {
                            senderId: senderId,
                            requestId: requestId
                        });
                        
                        // Also notify ourselves for data syncing
                        if (currentUserId) {
                            window.socket.emit('friend-request-you-accepted', {
                                recipientId: currentUserId,
                                senderId: senderId
                            });
                        }
                    }
                    
                    // Update UI
                    hideLoadingOverlay(overlayId);
                    showToast('success', 'Friend request accepted', 'You are now friends!');
                    
                    // Refresh friend status UI for all player cards
                    refreshFriendStatus();
                    
                    // Update FriendsService if available
                    if (window.FriendsService) {
                        console.log('[players.js] Notifying FriendsService about accepted friend request');
                        window.FriendsService.refreshFriends();
                    }
                    
                    // Refresh the friend request frame
                    checkForFriendRequests();
                } catch (err) {
                    console.error('[players.js] Error updating local storage after accepting friend request:', err);
                    hideLoadingOverlay(overlayId);
                    showToast('error', 'Error updating local data', 'Please refresh the page');
                }
            } else {
                hideLoadingOverlay(overlayId);
                showToast('success', 'Friend request accepted', 'You are now friends!');
            }
        } else {
            hideLoadingOverlay(overlayId);
            showToast('error', 'Error accepting friend request', data.message || 'Unknown error');
        }
    })
    .catch(err => {
        console.error('[players.js] Error accepting friend request:', err);
        hideLoadingOverlay(overlayId);
        showToast('error', 'Error accepting friend request', err.message);
        
        // Retry logic for network errors
        if (err.message.includes('Failed to fetch') || err.message.includes('Network error')) {
            setTimeout(() => {
                showToast('info', 'Retrying', 'Attempting to accept friend request again...');
                acceptFriendRequest(requestId, senderId);
            }, 2000);
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

// Helper function to ensure the friend tabs exist (global scope)
function ensureFriendTabsExist(frame) {
    // Check if we already have the tabs
    if (frame.querySelector('.frame-tabs')) {
        console.log('Friend tabs already exist');
        return;
    }
    
    console.log('Creating friend tab structure');
    const frameHeader = frame.querySelector('.section-header');
    if (!frameHeader) {
        console.error('No section-header found in frame');
        return;
    }
    
    // Add tabs to the frame header
    const originalTitle = frameHeader.innerHTML;
    frameHeader.innerHTML = `
        <div class="frame-tabs">
            <div class="frame-tab active" data-tab="requests">
                <i class="fas fa-user-plus"></i> Friend Requests
            </div>
            <div class="frame-tab" data-tab="friends">
                <i class="fas fa-user-friends"></i> Friends
            </div>
        </div>
        ${originalTitle}
    `;
    
    // Add tab content containers
    createTabContentContainers(frame);
    
    // Add tab click handlers
    addTabClickHandlers(frame);
    
    // Add styles
    addFriendsListStyles();
}

// Helper function to create tab content containers (global scope)
function createTabContentContainers(frame) {
    const frameContent = frame.querySelector('.friend-requests-content');
    if (!frameContent) {
        console.error('No .friend-requests-content found in frame');
        return;
    }
    
    console.log('Creating tab content containers');
    
    // Save original content for requests tab
    const requestsListContent = frameContent.querySelector('#friendRequestsList') ? 
        frameContent.querySelector('#friendRequestsList').innerHTML : '';
    
    // Create the tabbed interface
    frameContent.innerHTML = `
        <div class="tab-content active" id="requests-tab">
            <div id="friendRequestsList">
                ${requestsListContent}
            </div>
        </div>
        <div class="tab-content" id="friends-tab">
            <div id="friendsList">
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>Loading friends...</p>
                </div>
            </div>
        </div>
    `;
    
    console.log('Tab content containers created');
}

// Helper function to add tab click handlers (global scope)
function addTabClickHandlers(frame) {
    const frameHeader = frame.querySelector('.section-header');
    if (!frameHeader) return;
    
    const tabs = frameHeader.querySelectorAll('.frame-tab');
    if (!tabs.length) return;
    
    console.log('Adding tab click handlers');
    
    tabs.forEach(tab => {
        // Remove any existing click handlers by cloning and replacing
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        newTab.addEventListener('click', () => {
            console.log(`Tab clicked: ${newTab.dataset.tab}`);
            
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            newTab.classList.add('active');
            
            // Hide all tab content
            const frameContent = frame.querySelector('.friend-requests-content');
            if (!frameContent) return;
            
            const tabContents = frameContent.querySelectorAll('.tab-content');
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Show the selected tab content
            const tabName = newTab.dataset.tab;
            const selectedTab = document.getElementById(`${tabName}-tab`);
            if (selectedTab) {
                selectedTab.classList.add('active');
                
                // If friends tab selected, load friends
                if (tabName === 'friends') {
                    console.log('Friends tab selected, loading friends list');
                    loadFriendsList();
                } else if (tabName === 'requests') {
                    // If requests tab selected, update friend requests
                    console.log('Requests tab selected, checking for friend requests');
                    checkForFriendRequests();
                }
            } else {
                console.error(`Could not find tab content for ${tabName}`);
            }
        });
    });
}