// Messages page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('[messages.js] DOMContentLoaded - Initializing messages page');
    
    // Check if user is logged in first
    requireLogin();
    
    // Setup UI components
    initLayout();
    
    // Initialize socket events for real-time updates
    initSocketEvents();
    
    // Load all messages and notifications
    loadMessages();
    
    // Initialize tabs
    initializeTabs();
    
    // Load and display invites
    loadAndDisplayInvites();
    
    // Update unread count
    updateUnreadCount();
    
    // Add button event listeners
    addButtonEventListeners();
});

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
    
    // Set up notifications container if it doesn't exist
    if (!document.querySelector('.notifications-container')) {
        const notificationsContainer = document.createElement('div');
        notificationsContainer.className = 'notifications-container';
        document.body.appendChild(notificationsContainer);
    }
}

// Function to initialize socket events for real-time messaging
function initSocketEvents() {
    // Make sure SocketHandler is initialized
    if (typeof SocketHandler === 'undefined') {
        console.error('SocketHandler is not defined');
        return;
    }
    
    // If socket is already initialized, update invites UI
    if (SocketHandler.socket && SocketHandler.isConnected) {
        SocketHandler.updateInvitesUI();
    }
}

// Function to load all messages and notifications
function loadMessages() {
    // Display user's invites
    displayUserInvites();
    
    // Display notifications
    displayNotifications();
    
    // Display friend requests
    displayFriendRequests();
    
    // Display friends list
    displayFriends();
}

// Function to check if user is logged in, redirect if not
function requireLogin() {
    const userInfoStr = localStorage.getItem('userInfo');
    const token = localStorage.getItem('token');
    
    if (!userInfoStr || !token) {
        window.location.href = '../index.html';
        return false;
    }
    
    try {
        const userInfo = JSON.parse(userInfoStr);
        if (!userInfo || !userInfo._id) {
            window.location.href = '../index.html';
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('Error parsing user info:', e);
        window.location.href = '../index.html';
        return false;
    }
}

// Function to display stored invites for the current user
function displayUserInvites() {
    try {
        // Make sure SocketHandler is defined and has the method
        if (typeof SocketHandler !== 'undefined' && typeof SocketHandler.updateInvitesUI === 'function') {
            SocketHandler.updateInvitesUI();
            return;
        }
        
        // Fallback implementation if SocketHandler isn't available
        // Get current user
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) return;
        
        const userInfo = JSON.parse(userInfoStr);
        const userId = userInfo._id;
        
        // Get invites from localStorage
        let invites = [];
        const invitesStr = localStorage.getItem('invites');
        
        if (invitesStr) {
            const allInvites = JSON.parse(invitesStr);
            
            // Filter invites for current user
            invites = allInvites.filter(invite => 
                invite.recipientId === userId || invite.recipientId === userId.toString()
            );
        }
        
        // Get the invites container
        const invitesContainer = document.getElementById('invites-container');
        if (!invitesContainer) return;
        
        // Clear container
        invitesContainer.innerHTML = '';
        
        if (invites.length === 0) {
            invitesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <p>No invites</p>
                </div>`;
            return;
        }
        
        // Sort invites by date (newest first)
        invites.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Add each invite to UI
        invites.forEach(invite => {
            const inviteEl = document.createElement('div');
            inviteEl.className = 'invite-item pulse-glow';
            inviteEl.dataset.id = invite.id;
            
            const time = new Date(invite.timestamp).toLocaleTimeString();
            const date = new Date(invite.timestamp).toLocaleDateString();
            
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
                    <button class="btn btn-danger reject-invite">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            `;
            
            invitesContainer.appendChild(inviteEl);
        });
        
        // Add event listeners to buttons
        addInviteButtonListeners();
    } catch (err) {
        console.error('Error displaying invites:', err);
        showNotification('Error', 'Could not load invites', 'error');
    }
}

// Function to display notifications
function displayNotifications() {
    const notificationsContainer = document.getElementById('notifications-container');
    if (!notificationsContainer) return;
    
    // Placeholder for now - this would fetch notifications from API
    notificationsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-bell-slash"></i>
            <p>No notifications</p>
        </div>`;
}

// Function to display friend requests
function displayFriendRequests() {
    console.log('[messages.js] Displaying friend requests');
    const requestsContainer = document.getElementById('friend-requests-container');
    if (!requestsContainer) {
        console.error('Friend requests container not found');
        return;
    }
    
    try {
        // Get current user info
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            requestsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No friend requests</p>
                </div>`;
            return;
        }
        
        const userInfo = JSON.parse(userInfoStr);
        
        // Check if there are any friend requests
        let friendRequests = [];
        if (userInfo.friendRequests && userInfo.friendRequests.received) {
            friendRequests = userInfo.friendRequests.received;
        }
        
        console.log('[messages.js] Friend requests from localStorage:', friendRequests);
        
        // Clear container
        requestsContainer.innerHTML = '';
        
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
            const requestEl = document.createElement('div');
            requestEl.className = 'invite-item friend-request-item pulse-glow';
            requestEl.dataset.id = request._id;
            
            // Get sender info
            const senderId = request.sender?._id || request.sender;
            const senderName = request.sender?.username || request.senderName || 'User';
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
                    <button class="btn btn-primary accept-friend-request" data-id="${senderId}" data-request-id="${request._id}">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="btn btn-danger reject-friend-request" data-id="${senderId}" data-request-id="${request._id}">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            `;
            
            requestsContainer.appendChild(requestEl);
        });
        
        // Add event listeners for buttons
        addFriendRequestButtonListeners();
        
    } catch (err) {
        console.error('Error displaying friend requests:', err);
        requestsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading friend requests</p>
                <p class="error-details">${err.message}</p>
            </div>`;
    }
}

// Function to display friends list
function displayFriends() {
    console.log('[messages.js] Displaying friends list');
    const friendsContainer = document.getElementById('friends-container');
    if (!friendsContainer) {
        console.error('Friends container not found');
        return;
    }
    
    try {
        // Get current user info
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            friendsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>No friends</p>
                </div>`;
            return;
        }
        
        const userInfo = JSON.parse(userInfoStr);
        
        // If there are no friends in the user info
        if (!userInfo.friends || !userInfo.friends.length) {
            friendsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>No friends yet</p>
                    <button class="btn btn-primary mt-3" onclick="window.location.href='players.html'">
                        <i class="fas fa-user-plus"></i> Find Friends
                    </button>
                </div>`;
            return;
        }
        
        // Try to get detailed friend data from API
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        const token = localStorage.getItem('token');
        
        // First show loading indicator
        friendsContainer.innerHTML = `
            <div class="text-center p-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading friends...</p>
            </div>`;
        
        // Fetch friends data
        fetch(`${apiUrl}/users/friends`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.data || !data.data.length) {
                // No friends returned from API
                friendsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <p>No friends found</p>
                        <button class="btn btn-primary mt-3" onclick="window.location.href='players.html'">
                            <i class="fas fa-user-plus"></i> Find Friends
                        </button>
                    </div>`;
                return;
            }
            
            // Clear container
            friendsContainer.innerHTML = '';
            
            // Sort friends alphabetically by username
            const friends = data.data.sort((a, b) => {
                const nameA = a.username || '';
                const nameB = b.username || '';
                return nameA.localeCompare(nameB);
            });
            
            console.log('[messages.js] Friends from API:', friends);
            
            // Add each friend to UI
            friends.forEach(friend => {
                const friendEl = document.createElement('div');
                friendEl.className = 'friend-item';
                friendEl.dataset.id = friend._id;
                
                // Get display name or username
                const displayName = friend.profile?.displayName || friend.username || 'User';
                
                // Get status
                const status = friend.status || 'offline';
                const statusClass = status === 'online' ? 'status-online' : 'status-offline';
                const statusText = status === 'online' ? 'Online' : 'Offline';
                
                // Get avatar or initials
                const initials = (friend.username || 'U').substring(0, 2).toUpperCase();
                const avatarUrl = friend.profile?.avatar || '';
                
                const avatarHtml = avatarUrl ? 
                    `<img src="${avatarUrl}" alt="${displayName}" class="friend-avatar">` : 
                    `<div class="friend-avatar-initials">${initials}</div>`;
                
                friendEl.innerHTML = `
                    <div class="friend-header">
                        <div class="friend-info">
                            <div class="friend-avatar-container">
                                ${avatarHtml}
                                <span class="friend-status ${statusClass}" title="${statusText}"></span>
                            </div>
                            <div class="friend-details">
                                <div class="friend-name">${displayName}</div>
                                <div class="friend-username">@${friend.username || 'user'}</div>
                            </div>
                        </div>
                    </div>
                    <div class="friend-actions">
                        <button class="btn btn-sm btn-primary message-friend" title="Message" data-id="${friend._id}">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary view-profile" title="View Profile" data-id="${friend._id}">
                            <i class="fas fa-user"></i>
                        </button>
                        <button class="btn btn-sm btn-warning invite-friend" title="Invite to Lobby" data-id="${friend._id}">
                            <i class="fas fa-gamepad"></i>
                        </button>
                        <button class="btn btn-sm btn-danger remove-friend" title="Remove Friend" data-id="${friend._id}">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                `;
                
                friendsContainer.appendChild(friendEl);
            });
            
            // Add event listeners to friend actions
            addFriendActionListeners();
        })
        .catch(error => {
            console.error('Error fetching friends:', error);
            
            // Show error message
            friendsContainer.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading friends</p>
                    <p class="error-details">${error.message}</p>
                    <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>`;
        });
        
    } catch (err) {
        console.error('Error displaying friends:', err);
        friendsContainer.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading friends</p>
                <p class="error-details">${err.message}</p>
            </div>`;
    }
}

// Function to add event listeners to invite buttons
function addInviteButtonListeners() {
    // First check if SocketHandler is available
    if (typeof SocketHandler !== 'undefined' && typeof SocketHandler.addInviteButtonListeners === 'function') {
        SocketHandler.addInviteButtonListeners();
        return;
    }
    
    // Fallback implementation
    // Accept invite buttons
    document.querySelectorAll('.accept-invite').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const lobbyId = this.dataset.lobbyId;
            const inviteItem = this.closest('.invite-item');
            const inviteId = inviteItem ? inviteItem.dataset.id : null;
            
            if (lobbyId && inviteId) {
                // Show loading state
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
                this.disabled = true;
                
                // Remove invite from storage
                removeInvite(inviteId);
                
                // Show notification
                showNotification('Joining Lobby', 'Redirecting to lobby...');
                
                // Redirect to lobby page
                setTimeout(() => {
                    window.location.href = `lobby.html?id=${lobbyId}&join=true`;
                }, 1000);
            }
        });
    });
    
    // Reject invite buttons
    document.querySelectorAll('.reject-invite').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const inviteItem = this.closest('.invite-item');
            const inviteId = inviteItem ? inviteItem.dataset.id : null;
            
            if (inviteId) {
                // Show loading state
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining...';
                this.disabled = true;
                
                // Remove invite from storage
                removeInvite(inviteId);
                
                // Remove invite item from UI with animation
                if (inviteItem && inviteItem.parentNode) {
                    inviteItem.classList.add('fade-out');
                    
                    setTimeout(() => {
                        inviteItem.parentNode.removeChild(inviteItem);
                        
                        // Check if there are no more invites
                        const invitesContainer = document.getElementById('invites-container');
                        if (invitesContainer && (!invitesContainer.children.length || invitesContainer.children.length === 0)) {
                            invitesContainer.innerHTML = `
                                <div class="empty-state">
                                    <i class="fas fa-envelope-open"></i>
                                    <p>No invites</p>
                                </div>`;
                        }
                    }, 500);
                }
                
                // Show notification
                showNotification('Invite Declined', 'The invitation has been declined');
            }
        });
    });
}

// Function to remove an invite from storage
function removeInvite(inviteId) {
    // Use SocketHandler if available
    if (typeof SocketHandler !== 'undefined' && typeof SocketHandler.removeInvite === 'function') {
        return SocketHandler.removeInvite(inviteId);
    }
    
    // Fallback implementation
    try {
        let invites = [];
        const invitesStr = localStorage.getItem('invites');
        
        if (invitesStr) {
            invites = JSON.parse(invitesStr);
            
            // Remove the invite with the matching ID
            invites = invites.filter(invite => invite.id !== inviteId);
            
            // Save updated invites
            localStorage.setItem('invites', JSON.stringify(invites));
        }
    } catch (err) {
        console.error('Error removing invite:', err);
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

// Decline invite
function declineInvite(inviteId) {
    console.log('Declining invite:', inviteId);
    
    // Find the invite in storage
    let invites = [];
    try {
        const invitesJSON = localStorage.getItem('invites');
        if (invitesJSON) {
            invites = JSON.parse(invitesJSON);
        }
    } catch (e) {
        console.error('Error parsing invites from localStorage:', e);
    }
    
    // Filter out the declined invite
    const updatedInvites = invites.filter(invite => invite.id !== inviteId);
    
    // Save back to storage
    localStorage.setItem('invites', JSON.stringify(updatedInvites));
    
    // Notify via socket if available
    if (window.SocketHandler && window.SocketHandler.socket && window.SocketHandler.isConnected) {
        window.SocketHandler.socket.emit('decline-invite', { inviteId });
    }
    
    // Create notification directly to avoid recursive calls
    console.log('[messages.js] Creating direct notification for decline invite');
    
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-title">Invite Declined</span>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-body">
                The invitation has been declined
            </div>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Add close button functionality
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                notification.remove();
            });
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    } else {
        console.log('Invite declined: The invitation has been declined');
    }
    
    // Remove from UI
    const inviteItem = document.querySelector(`.invite-item[data-id="${inviteId}"]`);
    if (inviteItem) {
        inviteItem.remove();
        
        // Check if we need to show "no invites" message
        const remainingInvites = document.querySelectorAll('.invite-item');
        if (remainingInvites.length === 0) {
            const invitesContainer = document.querySelector('.invites-list');
            if (invitesContainer) {
                invitesContainer.innerHTML = '<p class="no-invites-message">No invites to show</p>';
            }
        }
    }
    
    // Refresh unread count
    updateUnreadCount();
}

// Make key functions globally available
window.displayUserInvites = displayUserInvites;
window.displayFriendRequests = displayFriendRequests;
window.displayFriends = displayFriends;
window.showNotification = showNotification;

// Add button event listeners
function addButtonEventListeners() {
    console.log('[messages.js] Adding event listeners to buttons');
    
    // Add event listeners to decline buttons
    document.querySelectorAll('.decline-invite').forEach(button => {
        button.addEventListener('click', (e) => {
            const inviteItem = e.target.closest('.invite-item');
            const inviteId = inviteItem?.dataset.id;
            
            if (inviteId) {
                // Show loading state
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                button.disabled = true;
                
                // Call our new decline function
                declineInvite(inviteId);
            } else {
                console.error('Cannot decline invite: No invite ID found');
            }
        });
    });
    
    // Add event listeners to accept buttons - these will be handled by socket-handler
    
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

// Initialize tabs
function initializeTabs() {
    console.log('[messages.js] Initializing tabs');
    
    try {
        // Get all tab navigation links
        const tabLinks = document.querySelectorAll('.nav-link[data-tab]');
        
        // Get all tab content containers
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Set the "Invites" tab as active by default
        let inviteTabActivated = false;
        
        tabLinks.forEach(link => {
            // Add click event listeners to each tab link
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Get the tab ID from the data-tab attribute
                const tabId = link.getAttribute('data-tab');
                console.log(`Tab link clicked: ${tabId}`);
                
                // Remove active class from all links
                tabLinks.forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                link.classList.add('active');
                
                // Hide all tab contents
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Show the selected tab content
                const selectedContent = document.getElementById(`${tabId}-tab`);
                if (selectedContent) {
                    selectedContent.classList.add('active');
                    
                    // If switching to the invites tab, refresh invites
                    if (tabId === 'invites') {
                        loadAndDisplayInvites();
                    }
                }
            });
            
            // Set "Invites" tab as active by default
            if (link.getAttribute('data-tab') === 'invites' && !inviteTabActivated) {
                // Trigger click to activate this tab
                link.classList.add('active');
                const invitesTab = document.getElementById('invites-tab');
                if (invitesTab) {
                    tabContents.forEach(content => content.classList.remove('active'));
                    invitesTab.classList.add('active');
                }
                inviteTabActivated = true;
            }
        });
        
        // If no tabs were activated, activate the first one
        if (!inviteTabActivated && tabLinks.length > 0) {
            const firstTab = tabLinks[0];
            firstTab.classList.add('active');
            
            const firstTabId = firstTab.getAttribute('data-tab');
            const firstTabContent = document.getElementById(`${firstTabId}-tab`);
            if (firstTabContent) {
                tabContents.forEach(content => content.classList.remove('active'));
                firstTabContent.classList.add('active');
            }
        }
        
        console.log('Tabs initialized successfully');
    } catch (err) {
        console.error('Error initializing tabs:', err);
    }
}

// Load and display invites
function loadAndDisplayInvites() {
    console.log('[messages.js] Loading and displaying invites');
    
    try {
        // Get current user
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            console.error('No user info found in localStorage');
            return;
        }
        
        const userInfo = JSON.parse(userInfoStr);
        const userId = userInfo._id;
        
        if (!userId) {
            console.error('User ID not found in user info');
            return;
        }
        
        // Get invites from localStorage
        let invites = [];
        const invitesStr = localStorage.getItem('invites');
        
        if (invitesStr) {
            try {
                const allInvites = JSON.parse(invitesStr);
                
                // Filter invites for current user
                invites = allInvites.filter(invite => 
                    invite.recipientId === userId || invite.recipientId === userId.toString()
                );
                
                console.log(`Found ${invites.length} invites for user ${userId}`);
            } catch (e) {
                console.error('Error parsing invites from localStorage:', e);
            }
        }
        
        // Get the invites container
        const invitesContainer = document.querySelector('.invites-list');
        if (!invitesContainer) {
            console.error('Invites container not found in DOM');
            return;
        }
        
        // Clear container
        invitesContainer.innerHTML = '';
        
        if (invites.length === 0) {
            invitesContainer.innerHTML = '<p class="no-invites-message">No invites to show</p>';
            return;
        }
        
        // Sort invites by date (newest first)
        invites.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        
        // Add each invite to UI
        invites.forEach(invite => {
            const inviteEl = document.createElement('div');
            inviteEl.className = 'invite-item';
            inviteEl.dataset.id = invite.id;
            inviteEl.dataset.lobbyId = invite.lobbyId;
            
            const timestamp = invite.timestamp ? new Date(invite.timestamp) : new Date();
            const time = timestamp.toLocaleTimeString();
            const date = timestamp.toLocaleDateString();
            
            inviteEl.innerHTML = `
                <div class="invite-header">
                    <span class="invite-game">${invite.gameType || 'Game'}</span>
                    <span class="invite-time">${time} ${date}</span>
                </div>
                <div class="invite-body">
                    <p><strong>${invite.senderName || 'Someone'}</strong> invited you to join "<span class="lobby-name">${invite.lobbyName || 'a lobby'}</span>"</p>
                    <p class="invite-message">${invite.message || ''}</p>
                </div>
                <div class="invite-actions">
                    <button class="btn btn-primary accept-invite" data-lobby-id="${invite.lobbyId}">
                        <i class="fas fa-check"></i> Accept & Join
                    </button>
                    <button class="btn btn-danger decline-invite">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            `;
            
            invitesContainer.appendChild(inviteEl);
        });
        
        // Update unread count
        updateUnreadCount();
        
        // Add event listeners to buttons
        updateEventListeners();
        
        console.log('Invites displayed and event listeners attached');
    } catch (err) {
        console.error('Error displaying invites:', err);
        showNotification('Error', 'Could not load invites', 'error');
    }
}

// Update unread count
function updateUnreadCount() {
    console.log('[messages.js] Updating unread count');
    
    try {
        // Get current user
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) {
            return;
        }
        
        const userInfo = JSON.parse(userInfoStr);
        const userId = userInfo._id;
        
        if (!userId) {
            return;
        }
        
        // Get invites from localStorage
        let invites = [];
        const invitesStr = localStorage.getItem('invites');
        
        if (invitesStr) {
            try {
                const allInvites = JSON.parse(invitesStr);
                
                // Filter invites for current user
                invites = allInvites.filter(invite => 
                    invite.recipientId === userId || invite.recipientId === userId.toString()
                );
            } catch (e) {
                console.error('Error parsing invites from localStorage:', e);
            }
        }
        
        // Count unread invites (all invites are considered unread for now)
        const unreadCount = invites.length;
        
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
        
        console.log(`Updated unread count: ${unreadCount}`);
    } catch (err) {
        console.error('Error updating unread count:', err);
    }
}

// Add event listeners for friend request buttons
function addFriendRequestButtonListeners() {
    console.log('[messages.js] Adding friend request button listeners');
    
    // Accept friend request buttons
    document.querySelectorAll('.accept-friend-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const senderId = btn.dataset.id;
            const requestId = btn.dataset.requestId;
            
            if (!senderId || !requestId) {
                console.error('Missing sender ID or request ID:', { senderId, requestId });
                showNotification('Error', 'Could not process friend request', 'error');
                return;
            }
            
            console.log(`[messages.js] Accepting friend request from ${senderId}, request ID: ${requestId}`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                btn.disabled = true;
                
                // Get the API URL
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Make API call to accept the request
                const response = await fetch(`${apiUrl}/users/friends/accept/${requestId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Update localStorage
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
                    // Remove the request from UI
                    const requestItem = btn.closest('.friend-request-item');
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
                    showNotification('Success', 'Friend request accepted!', 'success');
                    
                    // Update friends list
                    displayFriends();
                    
                    // Emit socket event if available
                    if (window.SocketHandler && window.SocketHandler.socket) {
                        window.SocketHandler.socket.emit('friend-request-accepted', {
                            senderId: senderId,
                            acceptorName: JSON.parse(localStorage.getItem('userInfo'))?.username || 'User'
                        });
                    }
                } else {
                    // Reset button
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Show error
                    showNotification('Error', data.message || 'Failed to accept friend request', 'error');
                }
            } catch (error) {
                console.error('Error accepting friend request:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', 'Could not process friend request', 'error');
            }
        });
    });
    
    // Reject friend request buttons
    document.querySelectorAll('.reject-friend-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const senderId = btn.dataset.id;
            const requestId = btn.dataset.requestId;
            
            if (!senderId || !requestId) {
                console.error('Missing sender ID or request ID:', { senderId, requestId });
                showNotification('Error', 'Could not process friend request', 'error');
                return;
            }
            
            console.log(`[messages.js] Rejecting friend request from ${senderId}, request ID: ${requestId}`);
            
            try {
                // Show loading state
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                btn.disabled = true;
                
                // Get the API URL
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const token = localStorage.getItem('token');
                
                // Make API call to reject the request
                const response = await fetch(`${apiUrl}/users/friends/reject/${requestId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Update localStorage
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
                    // Remove the request from UI
                    const requestItem = btn.closest('.friend-request-item');
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
                    showNotification('Friend Request', 'Friend request declined', 'info');
                    
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
                    showNotification('Error', data.message || 'Failed to decline friend request', 'error');
                }
            } catch (error) {
                console.error('Error rejecting friend request:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', 'Could not process friend request', 'error');
            }
        });
    });
}

// Add event listeners to friend action buttons
function addFriendActionListeners() {
    console.log('[messages.js] Adding friend action listeners');
    
    // View profile buttons
    document.querySelectorAll('.view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const friendId = btn.dataset.id;
            
            if (friendId) {
                window.location.href = `profile.html?id=${friendId}`;
            }
        });
    });
    
    // Message friend buttons
    document.querySelectorAll('.message-friend').forEach(btn => {
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
    
    // Remove friend buttons
    document.querySelectorAll('.remove-friend').forEach(btn => {
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
                const response = await fetch(`${apiUrl}/users/friends/remove/${friendId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Update localStorage if new user info is returned
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
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
                    
                    // Show success notification
                    showNotification('Friend Removed', `${friendName} has been removed from your friends list`, 'info');
                    
                    // Emit socket event if available
                    if (window.SocketHandler && window.SocketHandler.socket) {
                        window.SocketHandler.socket.emit('friend-removed', {
                            friendId: friendId
                        });
                    }
                } else {
                    // Reset button
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    
                    // Show error
                    showNotification('Error', data.message || 'Failed to remove friend', 'error');
                }
            } catch (error) {
                console.error('Error removing friend:', error);
                btn.innerHTML = originalText;
                btn.disabled = false;
                showNotification('Error', 'Could not remove friend', 'error');
            }
        });
    });
} 