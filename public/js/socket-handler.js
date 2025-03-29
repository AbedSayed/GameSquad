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
        
        // New invite notification
        this.socket.on('new-invite', (invite) => {
            console.log('New invite received:', invite);
            this.handleNewInvite(invite);
        });
        
        // Friend request notification
        this.socket.on('friend-request', (data) => {
            console.log('Friend request received:', data);
            this.showNotification('Friend Request', `${data.senderName} sent you a friend request!`);
            
            // Update UI if on messages page
            if (window.location.href.includes('messages.html')) {
                if (typeof displayFriendRequests === 'function') {
                    displayFriendRequests();
                }
            }
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
    
    // Manual method to process an invite - can be called from console for testing
    manuallyProcessInvite: function(invite) {
        console.log('Manually processing invite:', invite);
        this.handleNewInvite(invite);
        return 'Invite processed';
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
                                window.location.href = `lobby.html?id=${lobbyId}&join=true`;
                            } else {
                                // For other paths, use absolute path
                                window.location.href = `/pages/lobby.html?id=${lobbyId}&join=true`;  
                            }
                        } catch (err) {
                            console.error('Error during redirect:', err);
                            // Last resort absolute path
                            window.location.href = '/pages/lobby.html?id=' + lobbyId + '&join=true';
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
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining...';
                    button.disabled = true;
                    
                    // Remove invite from storage
                    this.removeInvite(inviteId);
                    
                    // Notify server that invite was rejected
                    if (this.socket && this.isConnected) {
                        console.log('Emitting reject-invite to server');
                        this.socket.emit('reject-invite', { inviteId });
                    } else {
                        console.warn('Socket not connected, cannot notify server about rejection');
                    }
                    
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
                    this.showNotification('Invite Declined', 'The invitation has been declined');
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
    
    // For testing: create a sample invite
    createSampleInvite: function() {
        const userInfo = this.getUserInfo();
        if (!userInfo) {
            console.error('Cannot create sample invite - no user info');
            return;
        }
        
        const sampleInvite = {
            id: 'sample-' + Date.now(),
            lobbyId: 'sample-lobby-' + Date.now(),
            senderName: 'Test User',
            senderId: 'test-user-id',
            recipientId: userInfo._id,
            lobbyName: 'Test Lobby',
            gameType: 'Demo Game',
            message: 'This is a test invite',
            timestamp: new Date().toISOString()
        };
        
        this.handleNewInvite(sampleInvite);
        return sampleInvite;
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
        
        // Add debugging button to create a sample invite (dev only)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setTimeout(() => {
                // Add test button to page
                const container = document.querySelector('.messages-body');
                if (container) {
                    const testButton = document.createElement('button');
                    testButton.className = 'btn btn-primary';
                    testButton.style.position = 'fixed';
                    testButton.style.bottom = '20px';
                    testButton.style.left = '20px';
                    testButton.style.zIndex = '9999';
                    testButton.innerHTML = 'Create Test Invite';
                    testButton.addEventListener('click', () => {
                        const invite = SocketHandler.createSampleInvite();
                        console.log('Created sample invite:', invite);
                    });
                    container.appendChild(testButton);
                    console.log('Added test invite button to page');
                }
            }, 1000);
        }
    }
}); 