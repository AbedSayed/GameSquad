// Messages page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('⚙️ [messages.js] DOMContentLoaded - Initializing messages page');
    
    // Set up periodic refresh of friend data
    const FRIEND_DATA_REFRESH_INTERVAL = 30000; // 30 seconds
    console.log(`⏱️ Setting up automatic friend data refresh every ${FRIEND_DATA_REFRESH_INTERVAL/1000} seconds`);
    
    // Initial data fetch after the page loads completely
    setTimeout(() => {
        console.log('🔄 Running initial friend data refresh...');
        fetchLatestFriendData()
            .then(data => {
                console.log('✅ Friend data refreshed successfully');
                // Refresh UI with new data
                displayFriendRequests();
                displayFriends();
            })
            .catch(console.error);
    }, 2000);
    
    // Set up periodic refresh
    setInterval(() => {
        console.log('🔄 Running periodic friend data refresh...');
        fetchLatestFriendData()
            .then(data => {
                // Refresh UI with new data
                displayFriendRequests();
                displayFriends();
            })
            .catch(console.error);
    }, FRIEND_DATA_REFRESH_INTERVAL);
    
    // Check if user is logged in first
    requireLogin();
    
    // Complete initialization directly
                completeInitialization();
    
    function completeInitialization() {
        // Setup UI components
        initLayout();
        
        // Initialize socket events for real-time updates
        initSocketEvents();
        
        // Initialize tabs
        initializeTabs();
        
        // Display friend requests from database
        displayFriendRequests();
        
        // Display friends list from database
        displayFriends();
        
        // Load and display invites
        loadAndDisplayInvites();
        
        // Update unread count
        updateUnreadCount();
        
        // Add button event listeners
        addButtonEventListeners();
    }
});

// Function to initialize the messages page
function initMessagesPage() {
    setupTabs();
    displayFriends();
    setupSearch();
    setupMessageInput();
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (userId) {
        openChatWithUser(userId);
    }
}

// Function to initialize layout and UI elements
function initLayout() {
    // Tab switching functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            
            // Update active state for nav links
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            link.classList.add('active');
            
            // Update active state for content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });
}

// Function to initialize socket events for real-time messaging
function initSocketEvents() {
    console.log('🔌 [messages.js] Initializing socket event handlers');
    
    // Make sure SocketHandler is initialized
    if (typeof SocketHandler === 'undefined') {
        console.error('❌ SocketHandler is not defined');
        return;
    }
    
    // If socket is already initialized, update invites UI
    if (SocketHandler.socket && SocketHandler.isConnected) {
        SocketHandler.updateInvitesUI();
        
        // Set up event handlers for friend-related events
        setupFriendSocketEvents();
    } else {
        // If not connected yet, wait for it
        console.log('⏳ Waiting for socket connection to be established');
        
        // Check every second if socket is available
        const socketCheckInterval = setInterval(() => {
            if (SocketHandler && SocketHandler.socket && SocketHandler.isConnected) {
                console.log('✅ Socket connection now available, setting up event handlers');
                clearInterval(socketCheckInterval);
                
                // Set up event handlers for friend-related events
                setupFriendSocketEvents();
            }
        }, 1000);
        
        // Clear interval after 10 seconds regardless
        setTimeout(() => clearInterval(socketCheckInterval), 10000);
    }
}

// Set up socket event handlers for friend-related events
function setupFriendSocketEvents() {
    console.log('👥 [messages.js] Setting up friend-related socket events');
    
    if (!SocketHandler || !SocketHandler.socket) {
        console.error('❌ Cannot set up friend socket events - SocketHandler not available');
        return;
    }
    
    // Remove existing handlers to prevent duplicates
    SocketHandler.socket.off('new-friend-request');
    SocketHandler.socket.off('friend-request-accepted');
    SocketHandler.socket.off('friend-request-rejected');
    
    // Listen for new friend requests
    SocketHandler.socket.on('new-friend-request', (data) => {
        console.log('📨 [messages.js] New friend request received:', data);
        
        // Show notification
        if (typeof window.showNotification === 'function') {
            window.showNotification(
                'New Friend Request', 
                `${data.senderName || 'Someone'} sent you a friend request`, 
                'info'
            );
        } else {
            showNotification(
                'New Friend Request', 
                `${data.senderName || 'Someone'} sent you a friend request`, 
                'info'
            );
        }
        
        // Create a global set for deduplication if it doesn't exist
        if (!window.processedFriendRequests) {
            window.processedFriendRequests = new Set();
        }
        
        // Add the request ID to the processed set
        if (data.requestId) {
            window.processedFriendRequests.add(data.requestId);
            console.log(`✅ Added request ${data.requestId} to global deduplication set`);
        }
        
        // Fetch latest data and update UI
        fetchLatestFriendData()
            .then(() => {
                // Update the friend requests display
                displayFriendRequests();
            })
            .catch(console.error);
    });
    
    // Friend request accepted event
    SocketHandler.socket.on('friend-request-accepted', (data) => {
        console.log('👍 [messages.js] Friend request accepted event:', data);
        
        // Create a global set for deduplication if it doesn't exist
        if (!window.processedFriendRequests) {
            window.processedFriendRequests = new Set();
        }
        
        // Check for duplicate events using requestId
        const requestId = data.requestId || '';
        if (requestId && window.processedFriendRequests.has(requestId)) {
            console.log(`🚫 [messages.js] Duplicate friend request accepted event: ${requestId}`);
            return;
        }
        
        // Add to processed set
        if (requestId) {
            window.processedFriendRequests.add(requestId);
            console.log(`✅ [messages.js] Added request ${requestId} to processed set`);
        }
        
        // Show notification
        if (typeof window.showNotification === 'function') {
            window.showNotification(
                'Friend Request Accepted', 
                `${data.acceptorName || 'Someone'} accepted your friend request`, 
                'success'
            );
        } else {
            showNotification(
                'Friend Request Accepted', 
                `${data.acceptorName || 'Someone'} accepted your friend request`, 
                'success'
            );
        }
        
        // Fetch latest data and update UI
        fetchLatestFriendData()
            .then(() => {
                // Update both friend requests and friends lists
                displayFriendRequests();
                displayFriends();
            })
            .catch(console.error);
    });
    
    // Friend request rejected event
    SocketHandler.socket.on('friend-request-rejected', (data) => {
        console.log('👎 [messages.js] Friend request rejected event:', data);
        
        // Show notification
        if (typeof window.showNotification === 'function') {
            window.showNotification(
                'Friend Request Declined', 
                `${data.rejectorName || 'Someone'} declined your friend request`, 
                'info'
            );
        } else {
            showNotification(
                'Friend Request Declined', 
                `${data.rejectorName || 'Someone'} declined your friend request`, 
                'info'
            );
        }
        
        // Fetch latest data and update UI
        fetchLatestFriendData()
            .then(() => {
                // Update friend requests display
                displayFriendRequests();
            })
            .catch(console.error);
    });
    
    console.log('✅ [messages.js] Friend-related socket events setup complete');
}

// Function to load all messages and notifications
function loadMessages() {
    // Display friend requests
    displayFriendRequests();
    
    // Display friends list
    displayFriends();
    
    // Display invites
    loadAndDisplayInvites();
}

// Function to check if user is logged in, redirect if not
function requireLogin() {
    console.log('[messages.js] Checking authentication status');
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('[messages.js] No authentication token found');
        window.location.href = '../index.html';
        return false;
    }
    
    // For better UX, also check if token is valid/not expired
    // This is a simple implementation - in a real app, you might validate the token on the server
    try {
        // Try to parse token (assuming JWT format)
        const base64Url = token.split('.')[1];
        if (base64Url) {
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            
            // Check if token is expired
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.error('[messages.js] Token expired');
                localStorage.removeItem('token');
            window.location.href = '../index.html';
            return false;
            }
        }
        
        return true;
    } catch (e) {
        console.error('[messages.js] Error checking token:', e);
        // If we can't verify, assume it's valid and let the API calls fail if needed
        return true;
    }
}

// Function to display friend requests
function displayFriendRequests() {
    console.log('🔍 [messages.js] Displaying friend requests');
    const requestsContainer = document.getElementById('friend-requests-container');
    if (!requestsContainer) {
        console.error('❌ Friend requests container not found');
        return;
    }
    
    try {
        // Show loading state
        requestsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading friend requests...</p>
            </div>`;
        
        // First, fetch fresh data from server to ensure we have the latest
        fetchLatestFriendData()
            .then(data => {
                // Clear container
                requestsContainer.innerHTML = '';
                
                // Get friend requests from the data
                const friendRequests = data.friendRequests?.received?.filter(req => 
                    req && (req.status === 'pending' || req.status === undefined)
                ) || [];
                
                console.log(`✅ [messages.js] Found ${friendRequests.length} friend requests from API`);
                
                // If no friend requests, show empty state
                if (!friendRequests.length) {
                    requestsContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-user-plus"></i>
                            <p>No friend requests</p>
                        </div>`;
                    return;
                }
                
                // Sort requests by date (newest first)
                friendRequests.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
                
                // Add each request to UI
                friendRequests.forEach(request => {
                    // Validate the request has minimum required data
                    if (!request || (!request._id && !request.sender)) {
                        console.warn('⚠️ [messages.js] Skipping invalid friend request:', request);
                        return; // Skip this request
                    }
                    
                    const requestEl = document.createElement('div');
                    requestEl.className = 'invite-item friend-request-item pulse-glow';
                    
                    // Ensure we have a valid request ID
                    const requestId = request._id ? request._id.toString() : request.id;
                    requestEl.dataset.id = requestId;
                    
                    // Get sender info - handle different possible structures
                    let senderId, senderName;
                    
                    if (typeof request.sender === 'object' && request.sender !== null) {
                        // If sender is populated as an object
                        senderId = request.sender._id || request.sender;
                        senderName = request.sender.username || request.senderName || 'Unknown User';
                    } else {
                        // If sender is just the ID string
                        senderId = request.sender;
                        senderName = request.senderName || 'Unknown User';
                    }
                    
                    console.log(`👤 [messages.js] Request ${requestId} from ${senderName} (${senderId})`);
                    
                    const message = request.message || `${senderName} would like to be your friend!`;
                    
                    // Format date
                    const requestDate = request.createdAt ? new Date(request.createdAt) : new Date();
                    const time = requestDate.toLocaleTimeString();
                    const date = requestDate.toLocaleDateString();
                    
                    requestEl.innerHTML = `
                        <div class="invite-header">
                            <span class="invite-game neon-text-secondary">Friend Request</span>
                            <span class="invite-time">${time} ${date}</span>
                        </div>
                        <div class="invite-body">
                            <p><strong>${senderName}</strong> sent you a friend request</p>
                            <p class="invite-message">${message}</p>
                        </div>
                        <div class="invite-actions">
                            <button class="btn btn-primary accept-friend-request" 
                                data-id="${senderId}" 
                                data-request-id="${requestId}"
                                data-sender-name="${senderName}">
                                <i class="fas fa-check"></i> Accept
                            </button>
                            <button class="btn btn-danger reject-friend-request" 
                                data-id="${senderId}" 
                                data-request-id="${requestId}"
                                data-sender-name="${senderName}">
                                <i class="fas fa-times"></i> Decline
                            </button>
                        </div>
                    `;
                    
                    requestsContainer.appendChild(requestEl);
                });
                
                // Add event listeners for buttons
                addFriendRequestButtonListeners();
            })
            .catch(error => {
                console.error('❌ Error fetching friend requests:', error);
                requestsContainer.innerHTML = `
                    <div class="empty-state error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading friend requests</p>
                        <p class="error-details">${error.message}</p>
                    </div>`;
            });
    } catch (err) {
        console.error('❌ Error displaying friend requests:', err);
        requestsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading friend requests</p>
                <p class="error-details">${err.message}</p>
            </div>`;
    }
}

// Function to fetch the latest friend data from server
async function fetchLatestFriendData() {
    console.log('🔄 [messages.js] Fetching latest friend data from server...');
    
    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('⚠️ Cannot fetch friends - not authenticated');
        return { friends: [], friendRequests: { sent: [], received: [] } };
    }
    
    try {
        // Get the API URL from config
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        
        // First fetch friends list
        const friendsResponse = await fetch(`${apiUrl}/friends`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!friendsResponse.ok) {
            throw new Error(`Failed to fetch friends: ${friendsResponse.status}`);
        }
        
        const friendsResult = await friendsResponse.json();
        console.log('📥 [messages.js] Fetched friends from API:', friendsResult);
        
        let friends = [];
        let friendRequests = { sent: [], received: [] };
        
        if (friendsResult.success) {
            friends = friendsResult.data || [];
            
            // Store to localStorage
            localStorage.setItem('friends', JSON.stringify(friends));
            
            // Now fetch friend requests
            const requestsResponse = await fetch(`${apiUrl}/friends/requests`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!requestsResponse.ok) {
                throw new Error(`Failed to fetch friend requests: ${requestsResponse.status}`);
            }
            
            const requestsResult = await requestsResponse.json();
            console.log('📥 [messages.js] Fetched friend requests from API:', requestsResult);
            
            if (requestsResult.success) {
                friendRequests = requestsResult.data || { sent: [], received: [] };
                
                // Get existing user info
                const userInfoStr = localStorage.getItem('userInfo');
                if (userInfoStr) {
                    const userInfo = JSON.parse(userInfoStr);
                    
                    // Update friend data in userInfo
                    userInfo.friends = friends.map(friend => friend._id);
                    userInfo.friendsData = friends;
                    userInfo.friendRequests = friendRequests;
                    
                    // Save updated userInfo back to localStorage
                    localStorage.setItem('userInfo', JSON.stringify(userInfo));
                    console.log('💾 [messages.js] Updated userInfo in localStorage with latest friend data');
                }
                
                // Also update FriendsService if available
                if (window.FriendsService) {
                    window.FriendsService.friends = friends;
                    window.FriendsService.friendRequests = friendRequests;
                }
            }
        }
        
        return { friends, friendRequests };
    } catch (error) {
        console.error('❌ [messages.js] Error fetching friend data from API:', error);
        return { friends: [], friendRequests: { sent: [], received: [] } };
    }
}

// Function to display friends list
function displayFriends() {
    console.log('👥 [messages.js] Displaying friends list');
    const friendsContainer = document.getElementById('friends-container');
    if (!friendsContainer) {
        console.error('❌ Friends container not found');
        return;
    }
    
    try {
        // Show loading state
        friendsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading friends...</p>
            </div>`;
            
        // Fetch the latest friend data from server
        fetchLatestFriendData()
        .then(data => {
                // Get friends from the response
                const friends = data.friends || [];
                console.log(`✅ [messages.js] Found ${friends.length} friends from API`);
            
            // Clear container
            friendsContainer.innerHTML = '';
            
                // If no friends, show empty state
            if (!friends.length) {
                friendsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-friends"></i>
                        <p>No friends yet</p>
                            <button class="btn btn-primary find-friends-btn">
                                <i class="fas fa-user-plus"></i> FIND FRIENDS
                        </button>
                    </div>`;
                    
                    // Add event listener to find friends button
                    const findFriendsBtn = friendsContainer.querySelector('.find-friends-btn');
                    if (findFriendsBtn) {
                        findFriendsBtn.addEventListener('click', () => {
                            window.location.href = 'players.html';
                        });
                    }
                    
                return;
            }
            
                // Sort friends alphabetically
            friends.sort((a, b) => {
                    const nameA = a.username || '';
                    const nameB = b.username || '';
                return nameA.localeCompare(nameB);
            });
                
                // Create a wrapper for friends
                const friendsWrapper = document.createElement('div');
                friendsWrapper.className = 'friends-list';
            
            // Add each friend to UI
            friends.forEach(friend => {
                    const username = friend.username || 'Unknown User';
                    const friendId = friend._id || friend;
                    
                    // Create the HTML for this friend
                const friendEl = document.createElement('div');
                friendEl.className = 'friend-item';
                    friendEl.dataset.id = friendId;
                    
                    // Determine if the friend is online (if status info exists)
                    const isOnline = friend.onlineStatus === 'online';
                    const statusClass = isOnline ? 'online' : 'offline';
                    const statusText = isOnline ? 'Online' : 'Offline';
                    
                    // Create friend avatar (first letter of username)
                    const avatarText = (username && username.charAt(0)) || '?';
                
                friendEl.innerHTML = `
                    <div class="friend-avatar">
                            <span>${avatarText}</span>
                            <span class="status-indicator ${statusClass}"></span>
                    </div>
                    <div class="friend-info">
                            <span class="friend-name">${username}</span>
                            <span class="friend-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="friend-actions">
                            <button class="btn btn-primary message-friend-btn" data-id="${friendId}" data-name="${username}">
                            <i class="fas fa-comment"></i> Message
                        </button>
                            <button class="btn btn-danger remove-friend-btn" data-id="${friendId}" data-name="${username}">
                                <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                `;
                
                    friendsWrapper.appendChild(friendEl);
            });
            
                // Add friends wrapper to container
                friendsContainer.appendChild(friendsWrapper);
                
                // Add event listeners for friend actions
            addFriendActionListeners();
        })
        .catch(error => {
                console.error('❌ Error fetching friends:', error);
            friendsContainer.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading friends</p>
                    <p class="error-details">${error.message}</p>
                </div>`;
        });
    } catch (err) {
        console.error('❌ Error displaying friends:', err);
        friendsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading friends</p>
                <p class="error-details">${err.message}</p>
            </div>`;
    }
}

// Function to show a notification
function showNotification(title, message, type = 'info') {
    // IMPORTANT: To prevent infinite recursion, don't call SocketHandler.showNotification
    // For debugging purposes
    console.log(`[messages.js] Showing notification: ${title} - ${message}`);
    
    // Create notification element directly - don't check for other notification functions
    const notificationsContainer = document.querySelector('.notifications-container');
    
    if (notificationsContainer) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        notificationsContainer.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 5000);
        
        // Close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.remove();
            });
        }
    } else {
        // Fallback to console log if no notification container
        console.log(`${title}: ${message}`);
    }
}

// Function to load and display invites 
function loadAndDisplayInvites() {
    console.log('[messages.js] Loading and displaying invites');
    const invitesContainer = document.getElementById('invites-container');
    
    if (!invitesContainer) {
        console.error('[messages.js] Invites container not found');
            return;
        }
        
    try {
        // Show loading state
        invitesContainer.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading invites...</p>
            </div>`;
        
        // Get the API URL from config
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('[messages.js] No token found, cannot fetch invites');
            invitesContainer.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Authentication error</p>
                </div>`;
            return;
        }
        
        // Fetch invites from the database API
        fetch(`${apiUrl}/invites`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            console.log('[messages.js] Invites API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('[messages.js] Invites API response data:', data);
        
        // Clear container
        invitesContainer.innerHTML = '';
        
            // Get the invites data
            const invites = data.invites || [];
            
            if (!invites.length) {
                invitesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-envelope-open"></i>
                        <p>No invites</p>
                    </div>`;
            return;
        }
        
        // Sort invites by date (newest first)
            invites.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.timestamp || 0);
                const dateB = new Date(b.createdAt || b.timestamp || 0);
                return dateB - dateA;
            });
        
        // Add each invite to UI
        invites.forEach(invite => {
            const inviteEl = document.createElement('div');
                inviteEl.className = 'invite-item pulse-glow';
                inviteEl.dataset.id = invite._id || invite.id;
            
                const time = new Date(invite.createdAt || invite.timestamp).toLocaleTimeString();
                const date = new Date(invite.createdAt || invite.timestamp).toLocaleDateString();
            
            inviteEl.innerHTML = `
                <div class="invite-header">
                        <span class="invite-game neon-text-secondary">${invite.gameType || 'Game'}</span>
                    <span class="invite-time">${time} ${date}</span>
                </div>
                <div class="invite-body">
                        <p><strong>${invite.senderName}</strong> invited you to join "<span class="neon-text">${invite.lobbyName}</span>"</p>
                    <p class="invite-message">${invite.message || ''}</p>
                </div>
                <div class="invite-actions">
                    <button class="btn btn-primary accept-invite" data-lobby-id="${invite.lobbyId}">
                        <i class="fas fa-check"></i> Accept & Join
                    </button>
                        <button class="btn btn-danger reject-invite" data-invite-id="${invite._id || invite.id}">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            `;
            
            invitesContainer.appendChild(inviteEl);
        });
        
        // Add event listeners to buttons
            addInviteButtonListeners();
            
            // Update badge count
            updateInviteBadge(invites.length);
        })
        .catch(error => {
            console.error('Error fetching invites:', error);
            invitesContainer.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading invites</p>
                    <p class="error-details">${error.message}</p>
                </div>`;
        });
    } catch (err) {
        console.error('Error displaying invites:', err);
        invitesContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading invites</p>
                <p class="error-details">${err.message}</p>
            </div>`;
    }
}

// Function to update the invite badge with a count
function updateInviteBadge(count) {
    const badge = document.querySelector('.invite-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }
}

// Update unread count
function updateUnreadCount() {
    console.log('[messages.js] Updating unread count');
    
    // Get the API URL from config
    const apiUrl = window.APP_CONFIG?.API_URL || '/api';
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error('[messages.js] No token found, cannot fetch unread counts');
        return;
    }
    
    // Fetch invites count from the API
    fetch(`${apiUrl}/invites/count`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const unreadCount = data.count || 0;
        
        // Update UI elements with unread count
        const unreadBadges = document.querySelectorAll('.unread-badge');
        unreadBadges.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        });
        
        // Update document title with unread count
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) Messages`;
        } else {
            document.title = 'Messages';
        }
        
        // Update invites tab with count
        const invitesTab = document.querySelector('[data-tab="invites"]');
        if (invitesTab) {
            const countSpan = invitesTab.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = unreadCount > 0 ? `(${unreadCount})` : '';
            }
        }
        
        // Update invite badge
        updateInviteBadge(unreadCount);
        
        console.log(`[messages.js] Updated unread count: ${unreadCount}`);
    })
    .catch(error => {
        console.error('[messages.js] Error fetching unread count:', error);
    });
}

// Add button event listeners
function addButtonEventListeners() {
    console.log('[messages.js] Adding event listeners to buttons');
    
    // Add event listeners for invite buttons
    if (typeof addInviteButtonListeners === 'function') {
        addInviteButtonListeners();
    }
    
    // Add event listeners for friend request buttons
    if (typeof addFriendRequestButtonListeners === 'function') {
        addFriendRequestButtonListeners();
    }
    
    // Add event listeners for friend action buttons
    if (typeof addFriendActionListeners === 'function') {
        addFriendActionListeners();
    }
    
    // Add refresh button listener
    const refreshButton = document.querySelector('#refresh-invites-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadAndDisplayInvites();
        });
    }
}

// Make sure to update event listeners when invites are loaded
function updateEventListeners() {
    addButtonEventListeners();
}

// Function to initialize tabs
function initializeTabs() {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
        const tabContents = document.querySelectorAll('.tab-content');
        
    navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
            // Get the tab identifier
                const tabId = link.getAttribute('data-tab');
            console.log(`[messages.js] Switching to tab: ${tabId}`);
                
            // Remove active class from all links and tabs
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
                
            // Add active class to current link and tab
                link.classList.add('active');
            const activeTab = document.getElementById(`${tabId}-tab`);
            if (activeTab) {
                activeTab.classList.add('active');
            }
            
            // When switching to friends tab, refresh friends data
            if (tabId === 'friends') {
                console.log('[messages.js] Refreshing friends data');
                displayFriends();
                displayFriendRequests();
            }
            
            // When switching to invites tab, refresh invites data
                    if (tabId === 'invites') {
                console.log('[messages.js] Refreshing invites data');
                        loadAndDisplayInvites();
            }
        });
    });
}

// Function to add invite button event listeners
function addInviteButtonListeners() {
    console.log('[messages.js] Adding invite button listeners');
    
    // Accept invite buttons
    document.querySelectorAll('.accept-invite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const lobbyId = btn.dataset.lobbyId;
            const inviteItem = btn.closest('.invite-item');
            const inviteId = inviteItem?.dataset.id;
            
            if (!lobbyId) {
                console.error('Missing lobby ID for invite');
                showNotification('Error', 'Invalid invite data', 'error');
                return;
            }
            
            console.log(`[messages.js] Accepting invite to lobby: ${lobbyId}`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
                btn.disabled = true;
                
                // Get API URL and token
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Make API call to accept the invite
                const response = await fetch(`${apiUrl}/invites/${inviteId}/accept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                console.log('[messages.js] Accept invite response:', data);
                
                if (response.ok && data.success) {
                    // Remove the invite from UI with animation
                    if (inviteItem) {
                        inviteItem.classList.add('fade-out');
                        setTimeout(() => {
                            inviteItem.remove();
                            // Check if there are no more invites
                            if (document.querySelectorAll('.invite-item').length === 0) {
                                const container = document.getElementById('invites-container');
                                if (container) {
                                    container.innerHTML = `
                                        <div class="empty-state">
                                            <i class="fas fa-envelope-open"></i>
                                            <p>No invites</p>
                                        </div>`;
                                }
                            }
                        }, 500);
                    }
                    
                    // Show success notification
                    showNotification('Success', 'Invite accepted! Redirecting to lobby...', 'success');
                    
                    // Redirect to the lobby page
                    setTimeout(() => {
                        window.location.href = `lobby.html?id=${lobbyId}`;
                    }, 1000);
                } else {
                    // Reset button
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Show error
                    const errorMessage = data?.message || 'Failed to accept invite';
                    console.error('[messages.js] Accept invite failed:', errorMessage);
                    showNotification('Error', errorMessage, 'error');
                }
            } catch (error) {
                console.error('[messages.js] Error accepting invite:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', 'Could not process invite', 'error');
            }
        });
    });
    
    // Reject/decline invite buttons
    document.querySelectorAll('.reject-invite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const inviteItem = btn.closest('.invite-item');
            const inviteId = btn.dataset.inviteId || inviteItem?.dataset.id;
            
            if (!inviteId) {
                console.error('Missing invite ID');
                showNotification('Error', 'Invalid invite data', 'error');
                return;
            }
            
            console.log(`[messages.js] Rejecting invite: ${inviteId}`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining...';
                btn.disabled = true;
                
                // Get API URL and token
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Make API call to reject the invite
                const response = await fetch(`${apiUrl}/invites/${inviteId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                console.log('[messages.js] Reject invite response:', data);
                
                if (response.ok && data.success) {
                    // Remove the invite from UI with animation
                    if (inviteItem) {
                        inviteItem.classList.add('fade-out');
                        setTimeout(() => {
                            inviteItem.remove();
                            // Check if there are no more invites
                            if (document.querySelectorAll('.invite-item').length === 0) {
                                const container = document.getElementById('invites-container');
                                if (container) {
                                    container.innerHTML = `
                                        <div class="empty-state">
                                            <i class="fas fa-envelope-open"></i>
                                            <p>No invites</p>
                                        </div>`;
                                }
                            }
                        }, 500);
                    }
                    
                    // Show success notification
                    showNotification('Success', 'Invite declined', 'info');
                    
                    // Update badge count
                    const remainingCount = document.querySelectorAll('.invite-item').length - 1;
                    updateInviteBadge(Math.max(0, remainingCount));
                } else {
                    // Reset button
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Show error
                    const errorMessage = data?.message || 'Failed to decline invite';
                    console.error('[messages.js] Reject invite failed:', errorMessage);
                    showNotification('Error', errorMessage, 'error');
                }
            } catch (error) {
                console.error('[messages.js] Error rejecting invite:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', 'Could not process invite', 'error');
            }
        });
    });
}

// Function to add event listeners to friend request buttons
function addFriendRequestButtonListeners() {
    console.log('[messages.js] Adding friend request button listeners');
    
    // Accept friend request buttons
    document.querySelectorAll('.accept-friend-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const senderId = btn.dataset.id;
            const requestId = btn.dataset.requestId;
            const senderName = btn.dataset.senderName || 'User';
            const requestItem = btn.closest('.friend-request-item');
            
            if (!senderId || !requestId) {
                console.error('Missing sender ID or request ID:', { senderId, requestId });
                showNotification('Error', 'Could not process friend request', 'error');
                return;
            }
            
            console.log(`[messages.js] Accepting friend request from ${senderName} (${senderId}), request ID: ${requestId}`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                btn.disabled = true;
                
                // Get API URL and token
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Define the API endpoint URL
                const url = `${apiUrl}/friends/accept/${requestId}`;
                console.log(`[messages.js] Making API call to: ${url}`);
                
                // Make API call to accept the request
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        senderId: senderId,
                        senderName: senderName,
                        requestId: requestId
                    })
                });
                
                console.log(`[messages.js] Response status: ${response.status}`);
                
                // Parse the response JSON
                let data;
                try {
                    data = await response.json();
                    console.log('[messages.js] Response data:', data);
                } catch (jsonError) {
                    console.error('[messages.js] Error parsing JSON response:', jsonError);
                    throw new Error('Invalid server response');
                }
                
                if (response.ok && data.success) {
                    // Remove the request from UI
                    if (requestItem) {
                        requestItem.classList.add('fade-out');
                        setTimeout(() => {
                            requestItem.remove();
                            
                            // Check if there are no more requests
                            if (document.querySelectorAll('.friend-request-item').length === 0) {
                                const container = document.getElementById('friend-requests-container');
                                if (container) {
                                    container.innerHTML = `
                                        <div class="empty-state">
                                            <i class="fas fa-user-plus"></i>
                                            <p>No friend requests</p>
                                        </div>`;
                                }
                            }
                        }, 500);
                    }
                    
                    // Show success notification
                    showNotification('Success', `Friend request from ${senderName} accepted!`, 'success');
                    
                    // Update friends list
                    displayFriends();
                    
                    // Emit socket event if available
                    if (window.SocketHandler && window.SocketHandler.socket) {
                        window.SocketHandler.socket.emit('friend-request-accepted', {
                            senderId: senderId
                        });
                    }
                } else {
                    // Reset button
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Show error
                    const errorMessage = data?.message || 'Failed to accept friend request';
                    console.error('[messages.js] Friend request acceptance failed:', errorMessage);
                    showNotification('Error', errorMessage, 'error');
                }
            } catch (error) {
                console.error('[messages.js] Error accepting friend request:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', error.message || 'Could not process friend request', 'error');
            }
        });
    });
    
    // Reject friend request buttons
    document.querySelectorAll('.reject-friend-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const senderId = btn.dataset.id;
            const requestId = btn.dataset.requestId;
            const senderName = btn.dataset.senderName || 'User';
            const requestItem = btn.closest('.friend-request-item');
            
            if (!senderId || !requestId) {
                console.error('Missing sender ID or request ID:', { senderId, requestId });
                showNotification('Error', 'Could not process friend request', 'error');
                return;
            }
            
            console.log(`[messages.js] Rejecting friend request from ${senderName} (${senderId}), request ID: ${requestId}`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                btn.disabled = true;
                
                // Get API URL and token
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Make API call to reject the request
                const url = `${apiUrl}/friends/reject/${requestId}`;
                console.log(`[messages.js] Making API call to: ${url}`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        senderId: senderId,
                        senderName: senderName,
                        requestId: requestId
                    })
                });
                
                console.log(`[messages.js] Response status: ${response.status}`);
                
                // Parse the response
                let data;
                try {
                    data = await response.json();
                    console.log('[messages.js] Response data:', data);
                } catch (jsonError) {
                    console.error('[messages.js] Error parsing JSON response:', jsonError);
                    throw new Error('Invalid server response');
                }
                
                if (response.ok && data.success) {
                    // Remove the request from UI
                    if (requestItem) {
                        requestItem.classList.add('fade-out');
                        setTimeout(() => {
                            requestItem.remove();
                            
                            // Check if there are no more requests
                            if (document.querySelectorAll('.friend-request-item').length === 0) {
                                const container = document.getElementById('friend-requests-container');
                                if (container) {
                                    container.innerHTML = `
                                        <div class="empty-state">
                                            <i class="fas fa-user-plus"></i>
                                            <p>No friend requests</p>
                                        </div>`;
                                }
                            }
                        }, 500);
                    }
                    
                    // Show success notification
                    showNotification('Success', `Friend request from ${senderName} declined`, 'info');
                    
                    // Emit socket event if available
                    if (window.SocketHandler && window.SocketHandler.socket) {
                        window.SocketHandler.socket.emit('friend-request-rejected', {
                            senderId: senderId
                        });
                    }
                        } else {
                            // Reset button
                            btn.innerHTML = originalText;
                            btn.disabled = false;
                            
                            // Show error
                    const errorMessage = data?.message || 'Failed to decline friend request';
                    console.error('[messages.js] Friend request rejection failed:', errorMessage);
                    showNotification('Error', errorMessage, 'error');
                }
            } catch (error) {
                console.error('[messages.js] Error rejecting friend request:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', error.message || 'Could not process friend request', 'error');
            }
        });
    });
}

// Add event listeners to friend action buttons
function addFriendActionListeners() {
    console.log('[messages.js] Adding friend action listeners');
    
    // View profile buttons
    document.querySelectorAll('.view-friend-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const friendId = btn.dataset.id;
            
            if (friendId) {
                window.location.href = `profile.html?id=${friendId}`;
            }
        });
    });
    
    // Message friend buttons
    document.querySelectorAll('.message-friend, .message-friend-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const friendId = btn.dataset.id;
            
            if (friendId) {
                // This would open a chat with the friend
                showNotification('Coming Soon', 'Direct messaging coming soon!', 'info');
            }
        });
    });
    
    // Invite friend buttons
    document.querySelectorAll('.invite-friend').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const friendId = btn.dataset.id;
            const friendName = btn.closest('.friend-item').querySelector('.friend-name').textContent;
            
            if (friendId) {
                // Redirect to lobbies page for now
                window.location.href = `lobbies.html?invite=${friendId}`;
            }
        });
    });
    
    // Remove friend buttons - fixed to target both classes
    document.querySelectorAll('.remove-friend, .remove-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const friendId = btn.dataset.id;
            const friendItem = btn.closest('.friend-item');
            const friendName = friendItem.querySelector('.friend-name').textContent;
            
            if (!friendId) return;
            
            // Ask for confirmation
            if (!confirm(`Are you sure you want to remove ${friendName} from your friends list?`)) {
                return;
            }
            
            console.log(`[messages.js] Removing friend: ${friendId} (${friendName})`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                // Get API URL and token
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Make API call to remove friend
                const response = await fetch(`${apiUrl}/friends/${friendId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Remove the friend item from UI with animation
                    friendItem.classList.add('fade-out');
                    setTimeout(() => {
                        friendItem.remove();
                        
                        // Check if there are no more friends
                        if (document.querySelectorAll('.friend-item').length === 0) {
                            const container = document.getElementById('friends-container');
                            if (container) {
                                container.innerHTML = `
                                    <div class="empty-state">
                                        <i class="fas fa-users-slash"></i>
                                        <p>No friends</p>
                                        <button class="btn btn-primary mt-3" onclick="window.location.href='players.html'">
                                            <i class="fas fa-user-plus"></i> Find Friends
                                        </button>
                                    </div>`;
                            }
                        }
                    }, 500);
                    
                    // Update localStorage data with the new friend status
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    } else {
                        // If server didn't return userInfo, fetch latest friend data
                        if (window.FriendsService && typeof window.FriendsService.loadFriends === 'function') {
                            await window.FriendsService.loadFriends();
                        } else {
                            // Fallback: Manually update localStorage
                            const userInfoStr = localStorage.getItem('userInfo');
                            if (userInfoStr) {
                                const userInfo = JSON.parse(userInfoStr);
                                if (userInfo.friends) {
                                    userInfo.friends = userInfo.friends.filter(id => String(id) !== String(friendId));
                                    localStorage.setItem('userInfo', JSON.stringify(userInfo));
                                }
                            }
                        }
                    }
                    
                    // Show success notification
                    showNotification('Friend Removed', `${friendName} has been removed from your friends list`, 'info');
                    
                    // Emit socket event if available
                    if (window.SocketHandler && window.SocketHandler.socket) {
                        window.SocketHandler.socket.emit('friend-removed', {
                            friendId: friendId,
                            friendName: friendName,
                            removedFriendId: friendId,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`[messages.js] Emitted friend-removed event for ${friendId} (${friendName})`);
                    }
                } else {
                    // Reset button
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Show error
                    showNotification('Error', data.message || 'Failed to remove friend', 'error');
                }
            } catch (error) {
                console.error('[messages.js] Error removing friend:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', 'Could not remove friend', 'error');
            }
        });
    });
}

// Make key functions globally available
window.displayFriendRequests = displayFriendRequests;
window.displayFriends = displayFriends;
window.loadAndDisplayInvites = loadAndDisplayInvites;
window.showNotification = showNotification; 