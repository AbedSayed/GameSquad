// Socket connection handler for GameSquad
const SocketHandler = {
    socket: null,
    isConnected: false,
    
    // Initialize socket connection
    init: function() {
        if (!window.io) {
            console.error('Socket.io not loaded');
            return;
        }
        
        // Get the API URL from config
        const apiUrl = window.API_URL || 'http://localhost:8080';
        console.log('Initializing socket with API URL:', apiUrl);
        
        // Create socket connection with proper options
        this.socket = io(apiUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
            autoConnect: true
        });
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Socket connected successfully:', this.socket.id);
            this.isConnected = true;
            
            // Authenticate after connection
            const userInfo = this.getUserInfo();
            if (userInfo && userInfo._id) {
                this.authenticate(userInfo._id);
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            this.isConnected = false;
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.isConnected = false;
        });
        
        this.socket.on('error', (error) => {
            console.error('Socket general error:', error);
        });
        
        // Set up event listeners
        this.setupListeners();
        
        return this.socket;
    },
    
    // Get user info from localStorage
    getUserInfo: function() {
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                return JSON.parse(userInfoStr);
            }
        } catch (err) {
            console.error('Error parsing user info:', err);
        }
        return null;
    },
    
    // Authenticate socket with user ID
    authenticate: function(userId) {
        if (!this.socket || !this.isConnected) {
            console.warn('Cannot authenticate socket - not connected');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Cannot authenticate socket - no token found');
            return;
        }
        
        console.log('Authenticating socket for user:', userId);
        this.socket.emit('authenticate', { userId, token });
    },
    
    // Set up all socket event listeners
    setupListeners: function() {
        if (!this.socket) return;
        
        // Debug all events in development
        this.socket.onAny((event, ...args) => {
            console.log(`[Socket Event] ${event}:`, args);
        });
        
        // Authentication response
        this.socket.on('authenticated', (data) => {
            console.log('Socket authenticated successfully:', data);
        });
        
        // Authentication error
        this.socket.on('auth_error', (error) => {
            console.error('Socket authentication error:', error);
        });
        
        // Friend status update
        this.socket.on('friend-status', (data) => {
            console.log('Friend status update received:', data);
            
            if (data && data.friendId && data.status) {
                // Update friend status in the UI
                this.updateFriendStatus(data.friendId, data.status);
                
                // If using FriendsService, update there too
                if (window.FriendsService) {
                    window.FriendsService.updateFriend(data.friendId, { status: data.status });
                }
            }
        });
        
        // Friend request response
        this.socket.on('friend-request-response', (data) => {
            console.log('Friend request response received:', data);
            
            if (data.accepted) {
                this.showNotification('Friend Request Accepted', `${data.username} accepted your friend request!`);
                
                // If using FriendsService, add the new friend
                if (window.FriendsService && data.friend) {
                    window.FriendsService.addFriend(data.friend);
                }
            } else {
                this.showNotification('Friend Request Declined', `${data.username} declined your friend request.`);
            }
        });
        
        // New invite notification
        this.socket.on('new-invite', (invite) => {
            console.log('New invite received:', invite);
            this.handleNewInvite(invite);
        });
        
        // Friend request notification
        this.socket.on('new-friend-request', (data) => {
            console.log('Socket received friend request event:', data);
            
            // Get current user to check if this request is for us
            const currentUser = this.getUserInfo();
            if (!currentUser || !currentUser._id) {
                console.warn('Cannot process friend request: No user info available');
                return;
            }
            
            // Check if this request is for the current user
            if (data.recipientId !== currentUser._id) {
                console.log(`Friend request not for current user (${currentUser._id}), ignoring`);
                return;
            }
            
            console.log(`Processing friend request for current user: ${currentUser._id}`);
            
            // Show notification
            this.showNotification('Friend Request', `${data.senderName} sent you a friend request!`, 'info');
            
            // Play a sound if available
            if (typeof Audio !== 'undefined') {
                try {
                    const notificationSound = new Audio('../resources/notification.mp3');
                    notificationSound.play().catch(e => console.log('Could not play notification sound'));
                } catch (e) {
                    console.log('Audio not supported');
                }
            }
            
            // Store the friend request in localStorage
            this.storeFriendRequest(data);
            
            // Update UI if on messages page
            if (window.location.href.includes('messages.html')) {
                // Try to call the page-specific function if available
                if (typeof displayFriendRequests === 'function') {
                    displayFriendRequests();
                }
                
                // Make the friend requests tab active if it exists
                const friendRequestsTab = document.querySelector('[data-tab="friend-requests"]');
                if (friendRequestsTab && !friendRequestsTab.classList.contains('active')) {
                    friendRequestsTab.click();
                }
            }
            
            // Update notification badge count
            this.updateNotificationBadge();
            
            // Show friend requests frame in players page if we're there
            if (window.location.href.includes('players.html')) {
                if (typeof showFriendRequestFrame === 'function') {
                    showFriendRequestFrame(data);
                }
            }
        });
        
        // Legacy event name for backward compatibility
        this.socket.on('friend-request', (data) => {
            console.log('Legacy friend request event received:', data);
            // Forward to the new handler
            this.socket.emit('new-friend-request', data);
        });
        
        // Lobby update notification
        this.socket.on('lobby-update', (data) => {
            console.log('Lobby update received:', data);
            if (data.type === 'join' || data.type === 'leave') {
                this.showNotification('Lobby Update', data.message);
            }
        });
    },
    
    // Handle new invite
    handleNewInvite: function(invite) {
        console.log('Processing invite:', invite);
        
        if (!invite || !invite.id) {
            console.error('Invalid invite received - missing ID:', invite);
            return;
        }
        
        // Ensure the invite has all necessary properties with fallbacks
        const processedInvite = {
            id: invite.id,
            lobbyId: invite.lobbyId || invite.lobby_id || '',
            senderName: invite.senderName || invite.sender_name || 'Someone',
            senderId: invite.senderId || invite.sender_id || '',
            recipientId: invite.recipientId || invite.recipient_id || '',
            lobbyName: invite.lobbyName || invite.lobby_name || 'Game Lobby',
            gameType: invite.gameType || invite.game_type || 'Game',
            message: invite.message || '',
            timestamp: invite.timestamp || new Date().toISOString()
        };
        
        console.log('Processed invite with fallbacks:', processedInvite);
        
        // Store invite in localStorage
        this.storeInvite(processedInvite);
        
        // Show notification
        this.showNotification('New Invite', `${processedInvite.senderName} invited you to join "${processedInvite.lobbyName}"`);
        
        // Update invites UI if on messages page
        if (window.location.href.includes('messages.html')) {
            this.updateInvitesUI();
            
            // Make the invites tab active if it's not already
            const invitesTab = document.querySelector('[data-tab="invites"]');
            if (invitesTab && !invitesTab.classList.contains('active')) {
                invitesTab.click();
            }
        }
    },
    
    // Store invite in localStorage
    storeInvite: function(invite) {
        try {
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                invites = JSON.parse(invitesStr);
                
                // Check if this invite already exists (avoid duplicates)
                const existingIndex = invites.findIndex(item => item.id === invite.id);
                if (existingIndex >= 0) {
                    console.log('Updating existing invite in localStorage');
                    // Update existing invite
                    invites[existingIndex] = invite;
                } else {
                    console.log('Adding new invite to localStorage');
                    // Add new invite
                    invites.push(invite);
                }
            } else {
                console.log('Creating first invite in localStorage');
                // First invite
                invites.push(invite);
            }
            
            // Store back in localStorage
            localStorage.setItem('invites', JSON.stringify(invites));
            console.log('Invites stored in localStorage:', invites);
            
            // Update notification badge
            this.updateNotificationBadge();
        } catch (err) {
            console.error('Error storing invite in localStorage:', err);
        }
    },
    
    // Show notification for new invite
    showNotification: function(title, message, type = 'info') {
        console.log(`[socket-handler.js] Showing notification: ${title} - ${message}`);
        
        // IMPORTANT: Never check for window.showNotification here to avoid circular references
        // Create notification directly
        const notificationContainer = document.querySelector('.notifications-container');
        
        if (notificationContainer) {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close">&times;</button>
            `;
            
            notificationContainer.appendChild(notification);
            
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
            // Browser notification if available and permitted
            const Notification = window.Notification;
            if (Notification && Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: '../images/logo.png'
                });
            } else {
                console.log(`${title}: ${message}`);
            }
        }
    },
    
    // Update invites UI on messages page
    updateInvitesUI: function() {
        const invitesContainer = document.getElementById('invites-container');
        if (!invitesContainer) {
            console.warn('Invites container not found in DOM');
            return;
        }
        
        try {
            console.log('Updating invites UI...');
            
            // Get current user ID
            const userInfo = this.getUserInfo();
            if (!userInfo || !userInfo._id) {
                console.warn('No user info available');
                return;
            }
            
            const userId = userInfo._id;
            console.log('Current user ID:', userId);
            
            // Get invites from localStorage
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                const allInvites = JSON.parse(invitesStr);
                console.log('All invites from localStorage:', allInvites);
                
                // Filter invites for current user
                invites = allInvites.filter(invite => {
                    const isForUser = invite.recipientId === userId || invite.recipientId === userId.toString();
                    console.log(`Checking invite ${invite.id} for user ${userId}: ${isForUser}`);
                    return isForUser;
                });
                
                console.log('Filtered invites for current user:', invites);
            } else {
                console.log('No invites found in localStorage');
            }
            
            // Clear container
            invitesContainer.innerHTML = '';
            
            if (invites.length === 0) {
                console.log('No invites to display');
                invitesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-envelope-open"></i>
                        <p>No invites</p>
                    </div>`;
                return;
            }
            
            // Sort invites by date (newest first)
            invites.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            console.log('Displaying invites:', invites);
            
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
            
            console.log('Added invite elements to DOM, adding event listeners...');
            
            // Add event listeners to buttons
            this.addInviteButtonListeners();
        } catch (err) {
            console.error('Error updating invites UI:', err);
            
            // Show error message in container
            invitesContainer.innerHTML = `
                <div class="empty-state error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading invites. Please refresh the page.</p>
                    <p class="error-details">${err.message}</p>
                </div>`;
        }
    },
    
    // Add event listeners to invite buttons
    addInviteButtonListeners: function() {
        console.log('Adding event listeners to invite buttons');
        
        // Accept invite buttons
        document.querySelectorAll('.accept-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Accept invite button clicked');
                const button = e.target.closest('.accept-invite');
                const lobbyId = button.dataset.lobbyId;
                const inviteItem = button.closest('.invite-item');
                const inviteId = inviteItem ? inviteItem.dataset.id : null;
                
                console.log(`Accept invite clicked for lobby: ${lobbyId}, invite: ${inviteId}`);
                
                if (lobbyId && inviteId) {
                    // Show loading state
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
                    button.disabled = true;
                    
                    // Remove invite from storage
                    this.removeInvite(inviteId);
                    
                    // Notify server that invite was accepted
                    if (this.socket && this.isConnected) {
                        console.log('Emitting accept-invite to server');
                        this.socket.emit('accept-invite', { inviteId, lobbyId });
                    } else {
                        console.warn('Socket not connected, cannot notify server about acceptance');
                    }
                    
                    // IMPORTANT - Don't use showNotification here to avoid recursion
                    console.log(`Redirecting to lobby: ${lobbyId}`);
                    
                    // Redirect to lobby page with slight delay
                    setTimeout(() => {
                        try {
                            // Use relative path if we're in the pages directory
                            const currentPath = window.location.pathname;
                            
                            // For paths including /pages/, use a relative path
                            if (currentPath.includes('/pages/')) {
                                window.location.href = `lobby.html?id=${lobbyId}&join=true&fromInvite=true`;
                            } else {
                                // For other paths, use absolute path
                                window.location.href = `/pages/lobby.html?id=${lobbyId}&join=true&fromInvite=true`;  
                            }
                        } catch (err) {
                            console.error('Error during redirect:', err);
                            // Last resort absolute path
                            window.location.href = '/pages/lobby.html?id=' + lobbyId + '&join=true&fromInvite=true';
                        }
                    }, 500);
                } else {
                    console.error('Missing lobby ID or invite ID', { lobbyId, inviteId });
                }
            });
        });
        
        // Reject invite buttons
        document.querySelectorAll('.reject-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Reject invite button clicked');
                const button = e.target.closest('.reject-invite');
                const inviteItem = button.closest('.invite-item');
                const inviteId = inviteItem ? inviteItem.dataset.id : null;
                
                console.log(`Reject invite clicked for invite: ${inviteId}`);
                
                if (inviteId) {
                    // Show loading state
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    button.disabled = true;
                    
                    // Remove invite from storage
                    this.removeInvite(inviteId);
                    
                    // Notify server that invite was declined
                    if (this.socket && this.isConnected) {
                        this.socket.emit('decline-invite', { inviteId });
                    }
                    
                    // Create our own notification to avoid recursion
                    console.log('[socket-handler.js] Invite declined:', inviteId);
                    
                    // Create a new notification directly
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
                    
                    // Remove the invite item from UI
                    setTimeout(() => {
                        if (inviteItem) {
                            inviteItem.remove();
                            
                            // Check if there are no more invites
                            const remainingInvites = document.querySelectorAll('.invite-item');
                            if (remainingInvites.length === 0) {
                                const noInvitesMessage = document.querySelector('.no-invites-message');
                                if (noInvitesMessage) {
                                    noInvitesMessage.style.display = 'block';
                                } else {
                                    const invitesContainer = document.querySelector('.invites-list');
                                    if (invitesContainer) {
                                        invitesContainer.innerHTML = '<p class="no-invites-message">No invites to show</p>';
                                    }
                                }
                            }
                        }
                    }, 300);
                } else {
                    console.error('Missing invite ID');
                }
            });
        });
    },
    
    // Remove invite from localStorage
    removeInvite: function(inviteId) {
        try {
            console.log(`Removing invite ${inviteId} from localStorage`);
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                invites = JSON.parse(invitesStr);
                
                // Remove the invite with the matching ID
                const originalLength = invites.length;
                invites = invites.filter(invite => invite.id !== inviteId);
                console.log(`Removed ${originalLength - invites.length} invite(s)`);
                
                // Save updated invites
                localStorage.setItem('invites', JSON.stringify(invites));
                
                // Update notification badge
                this.updateNotificationBadge();
            }
        } catch (err) {
            console.error('Error removing invite:', err);
        }
    },
    
    // Update notification badge
    updateNotificationBadge: function() {
        try {
            // Get current user ID
            const userInfo = this.getUserInfo();
            if (!userInfo || !userInfo._id) return;
            
            const userId = userInfo._id;
            
            // Count user's invites
            let inviteCount = 0;
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                const invites = JSON.parse(invitesStr);
                inviteCount = invites.filter(invite => 
                    invite.recipientId === userId || invite.recipientId === userId.toString()
                ).length;
            }
            
            // Update badge in navbar if it exists
            const badge = document.querySelector('.notification-badge');
            if (badge) {
                if (inviteCount > 0) {
                    badge.textContent = inviteCount;
                    badge.classList.add('show');
                } else {
                    badge.textContent = '';
                    badge.classList.remove('show');
                }
            }
            
            // Also update the invite badge in the messages page
            const inviteBadge = document.querySelector('.invite-badge');
            if (inviteBadge) {
                if (inviteCount > 0) {
                    inviteBadge.textContent = inviteCount;
                    inviteBadge.classList.add('show');
                } else {
                    inviteBadge.textContent = '';
                    inviteBadge.classList.remove('show');
                }
            }
        } catch (err) {
            console.error('Error updating notification badge:', err);
        }
    },
    
    // Update friend status in the UI
    updateFriendStatus: function(friendId, status) {
        console.log(`Updating status for friend ${friendId} to ${status}`);
        
        // Update in any friends list in the sidebar
        const friendItems = document.querySelectorAll(`.friend-item[data-id="${friendId}"]`);
        
        friendItems.forEach(item => {
            const statusEl = item.querySelector('.friend-status');
            if (statusEl) {
                // Remove old status classes
                statusEl.classList.remove('online', 'offline');
                
                // Add new status class
                statusEl.classList.add(status);
                
                // Update text
                statusEl.innerHTML = `<i class="fas fa-circle"></i> ${status === 'online' ? 'Online' : 'Offline'}`;
            }
        });
        
        // Update in localStorage if FriendsService is not available
        if (!window.FriendsService) {
            try {
                const friendsStr = localStorage.getItem('friends');
                if (friendsStr) {
                    const friends = JSON.parse(friendsStr);
                    
                    // Find and update the friend
                    const friendIndex = friends.findIndex(f => 
                        f._id === friendId || f.id === friendId
                    );
                    
                    if (friendIndex >= 0) {
                        friends[friendIndex].status = status;
                        localStorage.setItem('friends', JSON.stringify(friends));
                    }
                }
            } catch (err) {
                console.error('Error updating friend status in localStorage:', err);
            }
        }
    },
    
    // Store friend request in localStorage
    storeFriendRequest: function(data) {
        try {
            console.log('Storing friend request in localStorage:', data);
            
            // Get current user info
            const userInfo = this.getUserInfo();
            if (!userInfo) {
                console.error('Cannot store friend request - user info not found');
                return;
            }
            
            // Ensure friendRequests structure exists
            if (!userInfo.friendRequests) {
                userInfo.friendRequests = { sent: [], received: [] };
            }
            
            if (!userInfo.friendRequests.received) {
                userInfo.friendRequests.received = [];
            }
            
            // Create new request object
            const friendRequest = {
                _id: data.requestId || `local_${Date.now()}`,
                sender: data.senderId,
                senderName: data.senderName,
                status: 'pending',
                message: data.message || `${data.senderName} would like to be your friend!`,
                createdAt: data.timestamp || new Date().toISOString()
            };
            
            console.log('Created friend request object:', friendRequest);
            
            // Check if this request already exists
            const existingIndex = userInfo.friendRequests.received.findIndex(req => 
                (req.sender === data.senderId || 
                (req.sender && req.sender._id === data.senderId)) ||
                (req._id === data.requestId)
            );
            
            if (existingIndex >= 0) {
                console.log('Friend request already exists in localStorage, updating');
                userInfo.friendRequests.received[existingIndex] = friendRequest;
            } else {
                console.log('Adding new friend request to localStorage');
                userInfo.friendRequests.received.push(friendRequest);
            }
            
            // Update localStorage
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            console.log('Friend request stored in localStorage', userInfo.friendRequests.received);
            
            // Update server-side to ensure consistency (optional but recommended)
            this.updateServerWithFriendRequest(friendRequest);
            
            // Try to update UI if we're on the messages page
            this.updateFriendRequestUI();
        } catch (error) {
            console.error('Error storing friend request:', error);
        }
    },
    
    // Update the UI with the friend request
    updateFriendRequestUI: function() {
        if (window.location.href.includes('messages.html')) {
            // Check if displayFriendRequests function exists in global scope
            if (typeof window.displayFriendRequests === 'function') {
                console.log('Calling displayFriendRequests to update UI');
                window.displayFriendRequests();
            }
        }
    },
    
    // Sync with server to ensure consistency
    updateServerWithFriendRequest: function(request) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No auth token available, cannot sync friend request with server');
                return;
            }
            
            const apiUrl = window.APP_CONFIG?.API_URL || '/api';
            fetch(`${apiUrl}/users/friends/sync-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    request: request
                })
            }).then(response => {
                if (response.ok) {
                    console.log('Friend request synced with server');
                }
            }).catch(err => {
                console.warn('Failed to sync friend request with server:', err);
            });
        } catch (err) {
            console.warn('Error syncing friend request with server:', err);
        }
    }
};

// Initialize SocketHandler when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing SocketHandler...');
    SocketHandler.init();
    
    // If on messages page, update invites UI
    if (window.location.href.includes('messages.html')) {
        console.log('On messages page, updating UI...');
        setTimeout(() => {
            SocketHandler.updateInvitesUI();
            SocketHandler.updateNotificationBadge();
        }, 500);
    }
}); 