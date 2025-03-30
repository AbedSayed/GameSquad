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
            
            // Play notification sound
            this.playNotificationSound();
            
            // Store the friend request in localStorage
            this.storeFriendRequest(data);
            
            // Display friend request in banner on any page
            if (!window.location.href.includes('login.html') && 
                !window.location.href.includes('register.html')) {
                this.displayFriendRequestInBanner(data);
            }
            
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
        
        // Friend request acceptance
        this.socket.on('friend-request-accepted', (data) => {
            console.log('[SocketHandler] Friend request accepted:', data);
            this.handleFriendRequestAccepted(data);
        });
        
        // Friend request rejection
        this.socket.on('friend-request-rejected', (data) => {
            console.log('[SocketHandler] Friend request rejected:', data);
            // Handle rejection if needed
        });
        
        // When you accept a friend request
        this.socket.on('friend-request-you-accepted', (data) => {
            console.log('[SocketHandler] You accepted a friend request:', data);
            this.handleYouAcceptedFriendRequest(data);
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
            if (!userInfo || !userInfo._id) {
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
            
            // Create the friend request object
            const friendRequest = {
                _id: data.requestId || `local_${Date.now()}`,
                sender: data.senderId,
                senderName: data.senderName,
                message: data.message || `${data.senderName} would like to be your friend!`,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            console.log('Created friend request object:', friendRequest);
            
            // Check if this request already exists
            const existingIndex = userInfo.friendRequests.received.findIndex(req => 
                (req.sender && req.sender._id === data.senderId) || 
                (req.sender === data.senderId) ||
                (req._id === data.requestId)
            );
            
            if (existingIndex !== -1) {
                console.log('Friend request already exists in localStorage, updating');
                userInfo.friendRequests.received[existingIndex] = friendRequest;
            } else {
                console.log('Adding new friend request to localStorage');
                userInfo.friendRequests.received.push(friendRequest);
            }
            
            // Update localStorage
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            console.log('Friend request stored in localStorage', userInfo.friendRequests.received);
            
            // Display the friend request in the iframe if on players page
            this.displayFriendRequestInIframe(data);
            
            // Sync the request with the server to ensure it's saved
            this.syncFriendRequestWithServer(data);
        } catch (err) {
            console.error('Error storing friend request:', err);
        }
    },
    
    // Display friend request in iframe if on players page
    displayFriendRequestInIframe: function(data) {
        // Check if we're on the players page
        if (window.location.href.includes('players.html')) {
            console.log('Displaying friend request in banner on players page');
            
            // First, display in the new banner at the top of the page
            this.displayFriendRequestInBanner(data);
            
            // For backward compatibility, also update the old container
            this.updateLegacyFriendRequestFrame(data);
        }
    },
    
    // Display friend request in the new banner at the top of the page
    displayFriendRequestInBanner: function(data) {
        console.log('Displaying friend request in top banner:', data);
        
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
        const senderInitial = data.senderName ? data.senderName.charAt(0).toUpperCase() : 'U';
        const notificationMessage = `${data.senderName} would like to be your friend`;
        
        banner.innerHTML = `
            <div class="request-content">
                <div class="request-avatar">${senderInitial}</div>
                <div class="request-info">
                    <h3 class="request-title">Friend Request</h3>
                    <p class="request-message">${data.message || notificationMessage}</p>
                </div>
            </div>
            <div class="request-actions">
                <button class="btn btn-success accept-request-btn" data-sender-id="${data.senderId}" data-request-id="${data.requestId || ''}" data-sender-name="${data.senderName || ''}">
                    ACCEPT
                </button>
                <button class="btn btn-danger reject-request-btn" data-sender-id="${data.senderId}" data-request-id="${data.requestId || ''}" data-sender-name="${data.senderName || ''}">
                    DECLINE
                </button>
            </div>
            <button class="close-banner-btn" aria-label="Close">×</button>
        `;
        
        // Add event listeners to the buttons
        const acceptBtn = banner.querySelector('.accept-request-btn');
        const rejectBtn = banner.querySelector('.reject-request-btn');
        const closeBtn = banner.querySelector('.close-banner-btn');
        
        acceptBtn.addEventListener('click', () => {
            console.log('Accept button clicked in banner');
            const senderId = acceptBtn.dataset.senderId;
            const requestId = acceptBtn.dataset.requestId || `local_${Date.now()}`;
            const senderName = acceptBtn.dataset.senderName || 'User';
            
            // Show loading state
            acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ACCEPTING...';
            acceptBtn.disabled = true;
            rejectBtn.disabled = true;
            
            this.acceptFriendRequest(requestId, senderId, senderName);
            
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
            const requestId = rejectBtn.dataset.requestId || `local_${Date.now()}`;
            
            // Show loading state
            rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DECLINING...';
            rejectBtn.disabled = true;
            acceptBtn.disabled = true;
            
            this.rejectFriendRequest(requestId, senderId);
            
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
    },
    
    // Update the legacy friend request frame for backward compatibility
    updateLegacyFriendRequestFrame: function(data) {
        // Get the friend requests frame
        const friendRequestsFrame = document.getElementById('friendRequestsFrame');
        if (!friendRequestsFrame) {
            console.error('Legacy friend requests frame not found');
            return;
        }
        
        // Hide it by default - we're using the banner now
        friendRequestsFrame.style.display = 'none';
        
        // Get the list container
        const friendRequestsList = document.getElementById('friendRequestsList');
        if (!friendRequestsList) {
            console.error('Friend requests list not found');
            return;
        }
        
        // Remove empty state if it exists
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
        
        // Create request item
        const requestItem = document.createElement('div');
        requestItem.className = 'friend-request-item';
        requestItem.dataset.id = data.requestId;
        requestItem.dataset.senderId = data.senderId;
        
        requestItem.innerHTML = `
            <div class="request-info">
                <strong>${data.senderName}</strong>
                <p>${data.message || `${data.senderName} would like to be your friend!`}</p>
            </div>
            <div class="request-actions">
                <button class="btn btn-primary accept-request">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="btn btn-danger reject-request">
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
            this.acceptFriendRequest(data.requestId, data.senderId, data.senderName);
            requestItem.remove();
            
            // Check if there are no more requests
            if (friendRequestsList.children.length === 0) {
                friendRequestsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <p>No friend requests</p>
                    </div>
                `;
            }
        });
        
        rejectBtn.addEventListener('click', () => {
            this.rejectFriendRequest(data.requestId, data.senderId);
            requestItem.remove();
            
            // Check if there are no more requests
            if (friendRequestsList.children.length === 0) {
                friendRequestsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <p>No friend requests</p>
                    </div>
                `;
            }
        });
    },
    
    // Accept a friend request
    acceptFriendRequest: function(requestId, senderId, senderName) {
        try {
            console.log(`Attempting to accept friend request: ${requestId} from ${senderName} (${senderId})`);
            
            // Check request ID format and sender ID
            if (!requestId || typeof requestId !== 'string') {
                console.error('Invalid request ID format:', requestId);
                this.showNotification('Error', 'Invalid friend request ID', 'error');
                return;
            }
            
            if (!senderId) {
                console.error('Missing sender ID for friend request');
                this.showNotification('Error', 'Missing sender information', 'error');
                return;
            }
            
            // Get token for authorization
            const token = localStorage.getItem('token');
            if (!token) {
                this.showNotification('Error', 'You must be logged in to accept friend requests', 'error');
                return;
            }
            
            // Get the API URL from config
            const apiUrl = window.APP_CONFIG?.API_URL || '/api';
            const url = `${apiUrl}/friends/accept/${requestId}`;
            
            console.log(`Making API call to: ${url}`);
            console.log(`Request authorization: Bearer ${token.substring(0, 10)}...`);
            
            // First, check the local user info to see if the request still exists
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
            const friendRequest = userInfo.friendRequests?.received?.find(req => 
                req._id === requestId || 
                (req.sender && req.sender.toString() === senderId) ||
                req.sender === senderId
            );
            
            if (!friendRequest) {
                console.warn('Friend request not found in local storage:', { requestId, senderId });
                // Continue anyway as it might be in the database but not in localStorage
            } else {
                console.log('Found friend request in localStorage:', friendRequest);
            }
            
            // Make the API call to accept the request with senderId in the body
            fetch(url, {
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
                console.log(`Friend request acceptance response status: ${response.status}`);
                
                // Get the response text for better error reporting
                return response.text().then(text => {
                    if (!response.ok) {
                        try {
                            // Try to parse the error as JSON
                            const errorData = JSON.parse(text);
                            throw new Error(`Server error: ${errorData.message || response.statusText}`);
                        } catch (e) {
                            // If not valid JSON, use the raw text
                            throw new Error(`Server returned ${response.status}: ${text || response.statusText}`);
                        }
                    }
                    
                    // If it's a successful response, parse as JSON
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        throw new Error('Invalid JSON in server response');
                    }
                });
            })
            .then(data => {
                console.log('Friend request acceptance response:', data);
                
                if (data.success) {
                    // Update localStorage with new user info if provided
                    if (data.userInfo) {
                        console.log('Updating user info in localStorage');
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
                    // Show notification
                    this.showNotification('Friend Request Accepted', `${senderName} is now your friend!`, 'success');
                    
                    // Emit socket event if available
                    if (this.socket) {
                        console.log(`Emitting friend-request-accepted event for ${senderId}`);
                        this.socket.emit('friend-request-accepted', {
                            senderId: senderId,
                            acceptorName: this.getUserInfo()?.username || 'User'
                        });
                    }
                    
                    // Refresh the friends list if we're on the messages page
                    if (window.location.href.includes('messages.html') && typeof displayFriends === 'function') {
                        console.log('Refreshing friends list');
                        displayFriends();
                    }
                    
                    // Add friend to friends list in memory
                    const currentUserInfo = this.getUserInfo();
                    if (currentUserInfo && !currentUserInfo.friends) {
                        currentUserInfo.friends = [];
                    }
                    
                    if (currentUserInfo && !currentUserInfo.friends.includes(senderId)) {
                        currentUserInfo.friends.push(senderId);
                        localStorage.setItem('userInfo', JSON.stringify(currentUserInfo));
                    }
                } else {
                    this.showNotification('Error', data.message || 'Error accepting friend request', 'error');
                    console.error('Friend request acceptance failed:', data.message);
                }
            })
            .catch(error => {
                console.error('Error accepting friend request:', error);
                this.showNotification('Error', 'Could not accept friend request: ' + error.message, 'error');
                
                // For 404 errors, try sending friend request data again to ensure it's in the system
                if (error.message && error.message.includes('404')) {
                    console.log('Friend request not found, attempting to resync request data...');
                    
                    // Re-sync the friend request with the server
                    this.syncFriendRequestWithServer({
                        requestId: requestId,
                        senderId: senderId,
                        senderName: senderName,
                        message: `${senderName} would like to be your friend!`
                    });
                    
                    // Try to accept the friend request again after a delay to allow for sync
                    setTimeout(() => {
                        console.log('Retrying friend request acceptance after sync');
                        // Use direct fetch for retry to avoid infinite retry loop
                        fetch(url, {
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
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Update localStorage
                                if (data.userInfo) {
                                    localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                                }
                                this.showNotification('Friend Request Accepted', `${senderName} is now your friend!`, 'success');
                                
                                // Refresh UI if needed
                                if (window.location.href.includes('messages.html') && typeof displayFriends === 'function') {
                                    displayFriends();
                                }
                            } else {
                                this.showNotification('Error', data.message || 'Friend request could not be accepted', 'error');
                            }
                        })
                        .catch(retryError => {
                            console.error('Error in retry:', retryError);
                            this.showNotification('Error', 'Please try accepting the friend request again', 'info');
                        });
                    }, 1000);
                }
            });
        } catch (error) {
            console.error('Exception in acceptFriendRequest:', error);
            this.showNotification('Error', 'An unexpected error occurred: ' + error.message, 'error');
        }
    },
    
    // Reject a friend request
    rejectFriendRequest: function(requestId, senderId) {
        try {
            // Get token for authorization
            const token = localStorage.getItem('token');
            if (!token) {
                this.showNotification('You must be logged in to reject friend requests', 'error');
                return;
            }
            
            // Get the API URL from config
            const apiUrl = window.APP_CONFIG?.API_URL || '/api';
            
            // Make the API call to reject the request
            fetch(`${apiUrl}/friends/reject/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update localStorage with new user info if provided
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
                    // Show notification
                    this.showNotification('Friend request rejected', 'info');
                    
                    // Optionally emit socket event if we want to notify the sender
                    if (this.socket) {
                        this.socket.emit('friend-request-rejected', {
                            senderId: senderId
                        });
                    }
                } else {
                    this.showNotification(data.message || 'Error rejecting friend request', 'error');
                }
            })
            .catch(error => {
                console.error('Error rejecting friend request:', error);
                this.showNotification('Error rejecting friend request', 'error');
            });
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            this.showNotification('Error rejecting friend request', 'error');
        }
    },
    
    // Sync a friend request with the server
    syncFriendRequestWithServer: function(data) {
        try {
            // Validate required data
            if (!data || !data.senderId) {
                console.error('Cannot sync friend request - missing sender ID', data);
                return;
            }
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('Cannot sync friend request - no auth token');
                return;
            }
            
            // Ensure we have a requestId (generate one if missing)
            if (!data.requestId) {
                data.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                console.log('Generated request ID for sync:', data.requestId);
            }
            
            // Validate sender information
            if (!data.senderId || !data.senderName) {
                console.error('Missing required sender information, cannot sync friend request', data);
                return; // Don't proceed with incomplete sender information
            }

            // Don't allow "Unknown User" friend requests
            if (data.senderName === 'Unknown User') {
                console.error('Cannot sync friend request with "Unknown User" as sender');
                return;
            }
            
            const apiUrl = window.APP_CONFIG?.API_URL || '/api';
            const url = `${apiUrl}/friends/sync-request`;
            
            console.log(`Syncing friend request with server at ${url}`);
            console.log('Request data:', {
                requestId: data.requestId,
                senderId: data.senderId,
                senderName: data.senderName,
                message: data.message || `${data.senderName} would like to be your friend!`
            });
            
            // Add a loading indicator if we're on the messages page
            let loadingEl = null;
            if (window.location.href.includes('messages.html')) {
                loadingEl = document.createElement('div');
                loadingEl.className = 'sync-request-loading';
                loadingEl.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing friend request...';
                loadingEl.style.position = 'fixed';
                loadingEl.style.bottom = '10px';
                loadingEl.style.right = '10px';
                loadingEl.style.padding = '10px';
                loadingEl.style.background = 'rgba(0,0,0,0.7)';
                loadingEl.style.color = '#fff';
                loadingEl.style.borderRadius = '5px';
                loadingEl.style.zIndex = '9999';
                document.body.appendChild(loadingEl);
            }
            
            // Make API call to sync the request
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestId: data.requestId,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    message: data.message || `${data.senderName} would like to be your friend!`
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(responseData => {
                console.log('Friend request synced with server:', responseData);
                
                // Remove loading indicator if present
                if (loadingEl) {
                    loadingEl.innerHTML = '<i class="fas fa-check"></i> Friend request synced!';
                    setTimeout(() => {
                        loadingEl.remove();
                    }, 2000);
                }
                
                // If the server provides updated user info, update localStorage
                if (responseData.success && responseData.userInfo) {
                    // Get current user info
                    const currentUserStr = localStorage.getItem('userInfo');
                    let currentUserInfo = {};
                    
                    if (currentUserStr) {
                        try {
                            currentUserInfo = JSON.parse(currentUserStr);
                        } catch (e) {
                            console.error('Failed to parse current user info:', e);
                        }
                    }
                    
                    // Ensure we have the friendRequests structure
                    if (!currentUserInfo.friendRequests) {
                        currentUserInfo.friendRequests = { sent: [], received: [] };
                    }
                    
                    // Make sure we have received array
                    if (!currentUserInfo.friendRequests.received) {
                        currentUserInfo.friendRequests.received = [];
                    }
                    
                    // Make sure we have the sent array
                    if (!currentUserInfo.friendRequests.sent) {
                        currentUserInfo.friendRequests.sent = [];
                    }
                    
                    // If the server returned friendRequests, merge them
                    if (responseData.userInfo.friendRequests) {
                        // Handle received requests
                        if (responseData.userInfo.friendRequests.received && responseData.userInfo.friendRequests.received.length > 0) {
                            console.log('Server returned received requests:', responseData.userInfo.friendRequests.received);
                            
                            // Check each received request from server and add if not already present
                            responseData.userInfo.friendRequests.received.forEach(serverRequest => {
                                const exists = currentUserInfo.friendRequests.received.some(localRequest => {
                                    // Compare by _id or by sender
                                    return (localRequest._id && serverRequest._id && localRequest._id.toString() === serverRequest._id.toString()) ||
                                          (localRequest.sender && serverRequest.sender && 
                                           (typeof localRequest.sender === 'string' ? localRequest.sender : localRequest.sender.toString()) === 
                                           (typeof serverRequest.sender === 'string' ? serverRequest.sender : serverRequest.sender.toString()));
                                });
                                
                                if (!exists) {
                                    console.log('Adding new received request from server to localStorage:', serverRequest);
                                    currentUserInfo.friendRequests.received.push(serverRequest);
                                }
                            });
                        }
                        
                        // Handle sent requests
                        if (responseData.userInfo.friendRequests.sent && responseData.userInfo.friendRequests.sent.length > 0) {
                            console.log('Server returned sent requests:', responseData.userInfo.friendRequests.sent);
                            
                            // Check each sent request from server and add if not already present
                            responseData.userInfo.friendRequests.sent.forEach(serverRequest => {
                                const exists = currentUserInfo.friendRequests.sent.some(localRequest => {
                                    // Compare by _id or by recipient
                                    return (localRequest._id && serverRequest._id && localRequest._id.toString() === serverRequest._id.toString()) ||
                                          (localRequest.recipient && serverRequest.recipient && 
                                           (typeof localRequest.recipient === 'string' ? localRequest.recipient : localRequest.recipient.toString()) === 
                                           (typeof serverRequest.recipient === 'string' ? serverRequest.recipient : serverRequest.recipient.toString()));
                                });
                                
                                if (!exists) {
                                    console.log('Adding new sent request from server to localStorage:', serverRequest);
                                    currentUserInfo.friendRequests.sent.push(serverRequest);
                                }
                            });
                        }
                    }
                    
                    // Merge friends if present
                    if (responseData.userInfo.friends) {
                        if (!currentUserInfo.friends) {
                            currentUserInfo.friends = [];
                        }
                        
                        // Add any friends from server that aren't already in local friends
                        responseData.userInfo.friends.forEach(friendId => {
                            const friendIdStr = typeof friendId === 'string' ? friendId : friendId.toString();
                            if (!currentUserInfo.friends.some(id => {
                                const localIdStr = typeof id === 'string' ? id : id.toString();
                                return localIdStr === friendIdStr;
                            })) {
                                console.log('Adding new friend from server to localStorage:', friendIdStr);
                                currentUserInfo.friends.push(friendId);
                            }
                        });
                    }
                    
                    // Update localStorage
                    localStorage.setItem('userInfo', JSON.stringify(currentUserInfo));
                    console.log('Updated user info in localStorage with synced data');
                    
                    // Refresh UI if needed
                    if (window.location.href.includes('messages.html')) {
                        console.log('Refreshing UI after friend request sync');
                        
                        // Refresh friend requests display if the function exists
                        if (typeof displayFriendRequests === 'function') {
                            displayFriendRequests();
                        }
                        
                        // Refresh friends display if the function exists
                        if (typeof displayFriends === 'function') {
                            displayFriends();
                        }
                    }
                }
                
                return responseData;
            })
            .catch(error => {
                console.error('Error syncing friend request with server:', error.message);
                
                // Remove loading indicator if present
                if (loadingEl) {
                    loadingEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Sync failed';
                    setTimeout(() => {
                        loadingEl.remove();
                    }, 2000);
                }
                
                // Show notification if available
                if (this.showNotification) {
                    this.showNotification('Error', 'Failed to sync friend request with server', 'error');
                }
            });
        } catch (error) {
            console.error('Exception in syncFriendRequestWithServer:', error);
            
            // Show notification if available
            if (this.showNotification) {
                this.showNotification('Error', 'An error occurred while syncing friend request', 'error');
            }
        }
    },

    // Refresh user data from server
    refreshUserData: function() {
        console.log('Refreshing user data from server');
        
        // Get token for authorization
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found in localStorage');
            return Promise.reject(new Error('Not authenticated'));
        }
        
        // Get the API URL from config
        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
        
        // Fetch current user data
        return fetch(`${apiUrl}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(userData => {
            console.log('Updated user data received:', userData);
            
            // Preserve any existing friendsData if not provided in the new response
            if (!userData.friendsData && userData.friends && userData.friends.length > 0) {
                // Try to get existing friendsData from localStorage
                const existingUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
                if (existingUserInfo.friendsData) {
                    userData.friendsData = existingUserInfo.friendsData;
                    console.log('Preserved existing friendsData in userData');
                }
            }
            
            // Update localStorage
            localStorage.setItem('userInfo', JSON.stringify(userData));
            
            // Refresh UI if needed
            if (window.location.href.includes('messages.html')) {
                console.log('Refreshing UI after user data update');
                
                // Refresh friend requests if the function exists
                if (typeof displayFriendRequests === 'function') {
                    displayFriendRequests();
                }
                
                // Refresh friends display if the function exists
                if (typeof displayFriends === 'function') {
                    console.log('Refreshing friends display');
                    displayFriends();
                }
            }
            
            return userData;
        })
        .catch(error => {
            console.error('Error refreshing user data:', error);
            throw error;
        });
    },

    // Handle friend request acceptance (for the sender of the request)
    handleFriendRequestAccepted: function(data) {
        console.log('[SocketHandler] Processing accepted friend request:', data);
        
        try {
            // Get current user info
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) {
                console.error('[SocketHandler] No user info in localStorage');
                return;
            }
            
            const userInfo = JSON.parse(userInfoStr);
            
            // Update sent requests - mark this one as accepted
            if (userInfo.friendRequests && userInfo.friendRequests.sent) {
                const updatedSent = userInfo.friendRequests.sent.map(req => {
                    if (req.recipient && req.recipient.toString() === data.acceptorDetails._id) {
                        return { ...req, status: 'accepted' };
                    }
                    return req;
                });
                
                userInfo.friendRequests.sent = updatedSent;
            }
            
            // Add the acceptor to friends list if not already there
            if (!userInfo.friends) {
                userInfo.friends = [];
            }
            
            if (!userInfo.friends.includes(data.acceptorDetails._id)) {
                userInfo.friends.push(data.acceptorDetails._id);
            }
            
            // Store complete friend data
            if (!userInfo.friendsData) {
                userInfo.friendsData = [];
            }
            
            // Check if we already have this friend in data
            const existingIndex = userInfo.friendsData.findIndex(f => f._id === data.acceptorDetails._id);
            
            if (existingIndex >= 0) {
                // Update existing entry
                userInfo.friendsData[existingIndex] = data.acceptorDetails;
            } else {
                // Add new entry
                userInfo.friendsData.push(data.acceptorDetails);
            }
            
            // Save updated user info
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            // Show notification
            this.showFriendAcceptedNotification(data.acceptorDetails.username || 'A user');
            
            // Refresh the UI components
            this.refreshUIAfterFriendUpdate();
            
        } catch (error) {
            console.error('[SocketHandler] Error handling friend request acceptance:', error);
        }
    },

    // Handle when you accept a friend request (for the recipient/acceptor)
    handleYouAcceptedFriendRequest: function(data) {
        console.log('[SocketHandler] Processing your acceptance of friend request:', data);
        
        try {
            // Get current user info
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) {
                console.error('[SocketHandler] No user info in localStorage');
                return;
            }
            
            const userInfo = JSON.parse(userInfoStr);
            
            // Update friends data with the sender's complete information
            if (!userInfo.friendsData) {
                userInfo.friendsData = [];
            }
            
            // Check if we already have this friend in data
            const existingIndex = userInfo.friendsData.findIndex(f => f._id === data.senderDetails._id);
            
            if (existingIndex >= 0) {
                // Update existing entry
                userInfo.friendsData[existingIndex] = data.senderDetails;
            } else {
                // Add new entry
                userInfo.friendsData.push(data.senderDetails);
            }
            
            // Save updated user info
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            // Refresh the UI components
            this.refreshUIAfterFriendUpdate();
            
        } catch (error) {
            console.error('[SocketHandler] Error handling your friend request acceptance:', error);
        }
    },

    // Handle new friend request
    handleNewFriendRequest: function(data) {
        // Only process requests meant for this user
        const userInfoStr = localStorage.getItem('userInfo');
        if (!userInfoStr) return;
        
        const userInfo = JSON.parse(userInfoStr);
        const currentUserId = userInfo._id;
        
        if (data.recipientId !== currentUserId) {
            console.log('[SocketHandler] Friend request not for current user');
            return;
        }
        
        // Check if we have the FriendsService available
        if (window.FriendsService) {
            console.log('[SocketHandler] Notifying FriendsService about new friend request');
            window.FriendsService.addIncomingRequest(data);
        }
        
        // Show notification
        this.showNewFriendRequestNotification(data.senderName);
        
        // Update request frame if on players page
        if (typeof checkForFriendRequests === 'function') {
            setTimeout(checkForFriendRequests, 500);
        }
        
        // Update badges
        this.updateFriendRequestBadges();
    },

    // Show notification for new friend request
    showNewFriendRequestNotification: function(senderName) {
        if (typeof showNotification === 'function') {
            showNotification(`New Friend Request from ${senderName}`, 'info');
        } else if (typeof showToast === 'function') {
            showToast('info', 'New Friend Request', `${senderName} sent you a friend request`);
        } else {
            console.log('[SocketHandler] New friend request notification shown');
        }
    },

    // Show notification when friend request is accepted
    showFriendAcceptedNotification: function(acceptorName) {
        if (typeof showNotification === 'function') {
            showNotification(`${acceptorName} accepted your friend request`, 'success');
        } else if (typeof showToast === 'function') {
            showToast('success', 'Friend Request Accepted', `${acceptorName} is now your friend!`);
        } else {
            console.log('[SocketHandler] Friend request accepted notification shown');
        }
    },

    // Update friend request badges
    updateFriendRequestBadges: function() {
        // Update badge count if the function exists (in navbar)
        if (typeof updateFriendRequestBadge === 'function') {
            const userInfoStr = localStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                const requests = userInfo.friendRequests?.received?.filter(r => r.status === 'pending') || [];
                updateFriendRequestBadge(requests.length);
            }
        }
    },

    // Refresh UI components after friend updates
    refreshUIAfterFriendUpdate: function() {
        // Refresh friend list in messages page if available
        if (typeof displayFriends === 'function') {
            console.log('[SocketHandler] Refreshing friends list display');
            displayFriends();
        }
        
        // Refresh friend status in players page if available
        if (typeof refreshFriendStatus === 'function') {
            console.log('[SocketHandler] Refreshing friend status');
            refreshFriendStatus();
        }
        
        // Refresh friend requests if available
        if (typeof checkForFriendRequests === 'function') {
            console.log('[SocketHandler] Refreshing friend requests');
            checkForFriendRequests();
        }
        
        // Update friends service if available
        if (window.FriendsService && typeof window.FriendsService.refreshFriends === 'function') {
            console.log('[SocketHandler] Notifying FriendsService to refresh');
            window.FriendsService.refreshFriends();
        }
        
        // If we're on the players page, update all player cards
        const playerCards = document.querySelectorAll('.player-card');
        if (playerCards.length > 0) {
            console.log('[SocketHandler] Refreshing player cards UI');
            playerCards.forEach(card => {
                const playerId = card.dataset.id;
                if (playerId) {
                    const friendButtons = card.querySelectorAll('.friend-button, .add-friend, .friend-pending, .friend-status');
                    friendButtons.forEach(button => {
                        // Force a refresh of this button's state
                        if (typeof updateFriendButtonUI === 'function' && playerId) {
                            const playerName = card.dataset.name || 'Unknown';
                            updateFriendButtonUI(playerId, playerName, null); // null will cause a fresh check
                        }
                    });
                }
            });
        }
    },

    // Play notification sound
    playNotificationSound: function() {
        if (typeof Audio !== 'undefined') {
            try {
                // Use Web Audio API to create a notification sound programmatically
                // This doesn't rely on external files that might be missing
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create an oscillator for the notification sound
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                // Configure the sound
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                
                // Connect the nodes
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Play a short beep
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
                
                // Fade out
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
                
                console.log('Notification sound played successfully');
            } catch (e) {
                console.log('Could not play notification sound', e);
            }
        }
    }
};

// Initialize SocketHandler when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing SocketHandler...');
    
    if (!window.io) {
        console.warn('Socket.io is not loaded yet. Will attempt to initialize when available.');
        
        // Check for io in a few seconds - socket.io might be loaded asynchronously
        setTimeout(function checkAndInitSocket() {
            if (window.io) {
                console.log('Socket.io now available. Initializing SocketHandler.');
                SocketHandler.init();
                
                // If on messages page, update invites UI
                if (window.location.href.includes('messages.html')) {
                    console.log('On messages page, updating UI...');
                    setTimeout(() => {
                        SocketHandler.updateInvitesUI();
                        SocketHandler.updateNotificationBadge();
                    }, 500);
                }
            } else {
                console.warn('Socket.io still not available. Will try again in 2 seconds.');
                setTimeout(checkAndInitSocket, 2000);
            }
        }, 2000);
    } else {
        // Socket.io is available, initialize immediately
        SocketHandler.init();
        
        // If on messages page, update invites UI
        if (window.location.href.includes('messages.html')) {
            console.log('On messages page, updating UI...');
            setTimeout(() => {
                SocketHandler.updateInvitesUI();
                SocketHandler.updateNotificationBadge();
            }, 500);
        }
    }
    
    // Make SocketHandler globally available
    window.SocketHandler = SocketHandler;
}); 