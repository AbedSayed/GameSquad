// Socket connection handler for GameSquad
const SocketHandler = {
    socket: null,
    isConnected: false,
    processedAcceptanceEvents: new Set(),
    isInitialized: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    
    // Initialize global deduplication tracking
    initDeduplication: function() {
        // Create or ensure the global set exists
        if (!window.processedFriendRequests) {
            window.processedFriendRequests = new Set();
            console.log('Initialized global processedFriendRequests set');
        }
        return window.processedFriendRequests;
    },
    
    // Initialize socket connection
    init: function() {
        console.log('[socket-handler.js] Initializing socket handler...');
        
        // If already initialized, just ensure authentication
        if (this.isInitialized) {
            console.log('[socket-handler.js] Socket already initialized, checking authentication status');
            
            // If socket exists and is connected, check auth status
            if (this.socket && this.socket.connected) {
                const userInfo = this.getUserInfo();
                if (userInfo && userInfo._id) {
                    this.isAuthenticated()
                        .then(authenticated => {
                            if (!authenticated) {
                                console.log('[socket-handler.js] Re-authenticating existing socket connection');
                                this.authenticate(userInfo._id);
                            } else {
                                console.log('[socket-handler.js] Socket already authenticated');
                            }
                        });
                } else if (this.socket && !this.socket.connected) {
                    // If we have a socket instance but it's not connected, try to reconnect
                    console.log('[socket-handler.js] Socket exists but not connected, attempting to reconnect');
                    this.reconnect();
                }
            }
            return this;
        }
        
        // Create/ensure global deduplication tracking
        this.initDeduplication();
        
        this.setupSocket();
        this.isInitialized = true;
        
        // Attempt to authenticate if we have user info
        const userInfo = this.getUserInfo();
        if (userInfo && userInfo._id) {
            // Authenticate after a brief delay to ensure socket connection is established
            setTimeout(() => {
                if (this.socket && this.socket.connected) {
                    console.log('[socket-handler.js] Socket connected, authenticating during initialization');
                    this.authenticate(userInfo._id)
                        .then(() => {
                            console.log('[socket-handler.js] Socket authenticated during initialization');
                            
                            // Dispatch event for successful authentication
                            if (typeof window !== 'undefined' && window.dispatchEvent) {
                                window.dispatchEvent(new CustomEvent('socket:authenticated'));
                            }
                        })
                        .catch(err => {
                            console.error('[socket-handler.js] Authentication failed during initialization:', err);
                            
                            // Set up a retry for later
                            setTimeout(() => {
                                console.log('[socket-handler.js] Retrying authentication after failure');
                                if (this.socket && this.socket.connected) {
                                    this.authenticate(userInfo._id);
                                }
                            }, 3000);
                        });
                } else {
                    console.warn('[socket-handler.js] Socket not connected during initialization authentication attempt');
                    
                    // Set up a retry for authentication when socket connects
                    const retryAuth = () => {
                        if (this.socket && this.socket.connected) {
                            this.authenticate(userInfo._id)
                                .then(() => {
                                    console.log('[socket-handler.js] Socket authenticated after retry');
                                    
                                    // Dispatch event for successful authentication
                                    if (typeof window !== 'undefined' && window.dispatchEvent) {
                                        window.dispatchEvent(new CustomEvent('socket:authenticated'));
                                    }
                                })
                                .catch(err => {
                                    console.error('[socket-handler.js] Authentication failed after retry:', err);
                                });
                        } else {
                            console.warn('[socket-handler.js] Socket still not connected after retry, trying again in 2s');
                            setTimeout(retryAuth, 2000);
                        }
                    };
                    
                    // Retry authentication in 2 seconds
                    setTimeout(retryAuth, 2000);
                }
            }, 500);
        } else {
            console.warn('[socket-handler.js] No user info available, skipping authentication');
        }
        
        return this;
    },
    
    // Set up socket connection
    setupSocket: function() {
        try {
            console.log('[socket-handler.js] Setting up socket connection...');
            if (typeof io === 'undefined') {
                console.error('[socket-handler.js] Socket.io not loaded! Chat functionality will be limited.');
                // Try to load socket.io dynamically if not available
                this.loadSocketIOLibrary();
                return;
            }
            
            // Connect to socket server
            this.socket = io(window.location.origin, {
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                timeout: 10000,
                forceNew: false
            });
            
            // Set up connection events
            this.socket.on('connect', () => {
                console.log('[socket-handler.js] Socket connected successfully:', this.socket.id);
                this.isConnected = true;
                this.reconnectAttempts = 0; // Reset reconnect counter on successful connection
                
                // Authenticate socket with user ID
                const userInfo = this.getUserInfo();
                if (userInfo && userInfo._id) {
                    this.authenticate(userInfo._id);
                } else {
                    console.warn('[socket-handler.js] No user info available, cannot authenticate socket');
                }
                
                // Set up event listeners
                this.setupListeners();
                
                // Notify any listeners that socket is connected
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('socket:connected'));
                }
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('[socket-handler.js] Socket connection error:', error);
                this.isConnected = false;
                
                // Attempt to reconnect manually if needed
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[socket-handler.js] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    setTimeout(() => {
                        if (!this.isConnected) {
                            this.socket.connect();
                        }
                    }, 2000);
                }
                
                // Notify any listeners that socket failed to connect
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('socket:connect_error', { detail: error }));
                }
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('[socket-handler.js] Socket disconnected:', reason);
                this.isConnected = false;
                
                // If the disconnection is not from a user action, try to reconnect
                if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
                    // The disconnection was initiated by the server, try to reconnect manually
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        console.log(`[socket-handler.js] Attempting to reconnect after server-initiated disconnect`);
                        setTimeout(() => {
                            if (!this.isConnected) {
                                this.socket.connect();
                            }
                        }, 1500);
                    }
                }
                
                // Notify any listeners that socket disconnected
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('socket:disconnected', { detail: reason }));
                }
            });
            
            this.socket.on('error', (error) => {
                console.error('[socket-handler.js] Socket error:', error);
                
                // Notify any listeners of the error
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('socket:error', { detail: error }));
                }
            });
            
            console.log('[socket-handler.js] Socket connection setup complete, waiting for connect event');
        } catch (error) {
            console.error('[socket-handler.js] Error setting up socket:', error);
        }
    },
    
    // Manually reconnect socket
    reconnect: function() {
        if (this.socket) {
            console.log('[socket-handler.js] Attempting to reconnect socket...');
            if (this.socket.disconnected) {
                this.socket.connect();
            }
        } else {
            console.log('[socket-handler.js] No socket instance to reconnect, creating new connection');
            this.setupSocket();
        }
    },
    
    // Load Socket.IO library dynamically if it's not available
    loadSocketIOLibrary: function() {
        // Detect Socket.IO version from existing script tags
        const socketScripts = document.querySelectorAll('script[src*="socket.io"]');
        if (socketScripts.length > 0) {
            console.log('[socket-handler.js] Socket.IO script already exists in page');
            return;
        }
        
        console.log('[socket-handler.js] Attempting to load Socket.IO library dynamically');
        const script = document.createElement('script');
        script.src = "https://cdn.socket.io/4.8.1/socket.io.min.js";
        script.integrity = "sha384-+NYyNeU5B8x8awkk+SkbvwapFmeUngUKyPZNBv6kW1Xy47/3fUE36yTVCQDH9DSB";
        script.crossOrigin = "anonymous";
        script.onload = () => {
            console.log('[socket-handler.js] Socket.IO library loaded successfully, initializing socket');
            this.setupSocket();
        };
        script.onerror = (error) => {
            console.error('[socket-handler.js] Failed to load Socket.IO library:', error);
        };
        document.head.appendChild(script);
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
        if (!this.socket) {
            console.warn('[socket-handler.js] Cannot authenticate socket - not initialized');
            return Promise.reject(new Error('Socket not initialized'));
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('[socket-handler.js] Cannot authenticate socket - no token found');
            return Promise.reject(new Error('No authentication token available'));
        }
        
        console.log('[socket-handler.js] Authenticating socket for user:', userId);
        
        return new Promise((resolve, reject) => {
            // Set up one-time handlers for authentication response
            const onAuthenticated = (data) => {
                console.log('[socket-handler.js] Socket authenticated successfully:', data);
                // Remove the listeners after we get a response
                this.socket.off('authenticated', onAuthenticated);
                this.socket.off('auth_error', onAuthError);
                resolve(data);
            };
            
            const onAuthError = (error) => {
                console.error('[socket-handler.js] Socket authentication error:', error);
                // Remove the listeners after we get a response
                this.socket.off('authenticated', onAuthenticated);
                this.socket.off('auth_error', onAuthError);
                reject(error);
            };
            
            // Set up listeners for the response
            this.socket.once('authenticated', onAuthenticated);
            this.socket.once('auth_error', onAuthError);
            
            // Add a timeout for the authentication response
            const authTimeout = setTimeout(() => {
                // Remove the listeners if we time out
                this.socket.off('authenticated', onAuthenticated);
                this.socket.off('auth_error', onAuthError);
                console.warn('[socket-handler.js] Socket authentication timed out');
                reject(new Error('Authentication timed out'));
            }, 5000);
            
            // Send the authentication request
            this.socket.emit('authenticate', { userId, token });
        });
    },
    
    // Check if socket is authenticated
    isAuthenticated: function() {
        return new Promise((resolve) => {
            if (!this.socket) {
                resolve(false);
                return;
            }
            
            // First check if we have a user ID in the socket handler
            const userInfo = this.getUserInfo();
            if (!userInfo || !userInfo._id) {
                resolve(false);
                return;
            }
            
            // If socket is not connected, we're not authenticated
            if (!this.socket.connected) {
                resolve(false);
                return;
            }
            
            // Send a ping to verify the connection
            this.socket.emit('ping', {}, (response) => {
                if (response && response.authenticated) {
                    resolve(true);
                } else {
                    // If we get a response but not authenticated, try to authenticate
                    this.authenticate(userInfo._id)
                        .then(() => resolve(true))
                        .catch(() => resolve(false));
                }
            });
            
            // Timeout after 2 seconds
            setTimeout(() => resolve(false), 2000);
        });
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
        
        // Global deduplication tracking for friend acceptances
        if (!window.processedFriendRequests) {
            window.processedFriendRequests = new Set();
        }
        
        // Add event handler for friend-request-accepted with deduplication
        this.socket.on('friend-request-accepted', (data) => {
            console.log('✅ Friend request accepted event received:', data);
            
            // Ensure we track both global deduplication sets
            if (!window.recentNotifications) {
                window.recentNotifications = new Set();
                console.log('Created window.recentNotifications from socket event handler');
            }
            
            // Use just the requestId for deduplication to catch events from all sources
            const requestId = data.requestId || '';
            
            // Check if we already processed this notification 
            if (window.processedFriendRequests && window.processedFriendRequests.has(requestId)) {
                console.log('🚫 DUPLICATE DETECTED! Already processed this friend request:', requestId);
                return;
            }
            
            console.log('✨ Processing new acceptance for request:', requestId);
            
            // Add to processed events - use global window to ensure shared across instances
            if (window.processedFriendRequests) {
                window.processedFriendRequests.add(requestId);
                console.log('Added request to processed set:', requestId);
                
                // Clean up old events (keep only last 50)
                if (window.processedFriendRequests.size > 50) {
                    const iterator = window.processedFriendRequests.values();
                    const removed = iterator.next().value;
                    window.processedFriendRequests.delete(removed);
                    console.log('Removed oldest request from processed set:', removed);
                }
            }
            
            // Process the acceptance
            this.handleFriendRequestAccepted(data);
        });
        
        // Similar deduplication for friend-request-you-accepted event
        this.socket.on('friend-request-you-accepted', (data) => {
            console.log('You accepted friend request:', data);
            
            // Use just the requestId for deduplication
            const requestId = data.requestId || '';
            
            // Check if we already processed this notification
            if (window.processedFriendRequests.has(requestId)) {
                console.log('🚫 DUPLICATE DETECTED! Already processed this friend acceptance:', requestId);
                return;
            }
            
            console.log('✨ Processing new self-acceptance for request:', requestId);
            
            // Add to processed events - use global window to ensure shared across instances
            window.processedFriendRequests.add(requestId);
            
            // Process the acceptance
            this.handleYouAcceptedFriendRequest(data);
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
        
        // Friend request rejection
        this.socket.on('friend-request-rejected', (data) => {
            console.log('[SocketHandler] Friend request rejected:', data);
            // Handle rejection if needed
        });
        
        // Listen for private messages
        this.socket.on('newPrivateMessage', (data) => {
            console.log('[socket-handler.js] Received private message:', data);
            
            // Broadcast to all handlers of this event
            if (window.dispatchEvent) {
                // Create a custom event with the data
                const event = new CustomEvent('privateMessage', { detail: data });
                window.dispatchEvent(event);
            }
            
            // Show notification if not on messages page and message is incoming
            const currentUserId = this.getUserId();
            if (data.senderId !== currentUserId) {
                // Get sender name
                let senderName = data.senderName || 'Someone';
                
                // Try to get the name from friends cache if available
                if (window.FriendsService && window.FriendsService.getFriendById) {
                    const friend = window.FriendsService.getFriendById(data.senderId);
                    if (friend && friend.username) {
                        senderName = friend.username;
                    }
                }
                
                // Check if there's already a chat window open
                const chatOpen = document.querySelector(`.friend-chat-container[data-friend-id="${data.senderId}"]`);
                const chatIsMinimized = chatOpen && chatOpen.classList.contains('minimized');
                
                // If chat is not open or is minimized, show a notification
                if (!chatOpen || chatIsMinimized) {
                    this.showNotification(
                        `Message from ${senderName}`, 
                        data.text || data.message,
                        'message'
                    );
                }
            }
        });
        
        // Handle message delivery status
        this.socket.on('messageStatus', (data) => {
            console.log('[socket-handler.js] Message status update:', data);
            
            // Broadcast the status update
            if (window.dispatchEvent) {
                const event = new CustomEvent('messageStatus', { detail: data });
                window.dispatchEvent(event);
            }
        });
    },
    
    // Handle new invite
    handleNewInvite: function(invite) {
        console.log('Processing invite:', invite);
        
        if (!invite || (!invite.id && !invite._id)) {
            console.error('Invalid invite received - missing ID:', invite);
            return;
        }
        
        // Ensure the invite has all necessary properties with fallbacks
        const processedInvite = {
            // Use _id (database ID) if available, otherwise use provided id or generate one
            _id: invite._id || null,
            id: invite.id || `inv_${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
            lobbyId: invite.lobbyId || invite.lobby_id || '',
            senderName: invite.senderName || invite.sender_name || 'Someone',
            senderId: invite.senderId || invite.sender_id || '',
            recipientId: invite.recipientId || invite.recipient_id || '',
            lobbyName: invite.lobbyName || invite.lobby_name || 'Game Lobby',
            gameType: invite.gameType || invite.game_type || 'Game',
            message: invite.message || '',
            timestamp: invite.timestamp || new Date().toISOString(),
            status: invite.status || 'pending'
        };
        
        console.log('Processed invite with fallbacks:', processedInvite);
        
        // Store invite in localStorage
        this.storeInvite(processedInvite);
        
        // Show notification
        this.showNotification('New Invite', `${processedInvite.senderName} invited you to join "${processedInvite.lobbyName}"`);
        
        // Update the UI if we're on the messages page
        if (window.location.pathname.includes('/messages.html') || window.location.pathname.includes('/pages/messages.html')) {
            this.updateInvitesUI();
            
            // Also try to refresh invites from the server
            if (typeof loadAndDisplayInvites === 'function') {
                setTimeout(() => {
                    loadAndDisplayInvites();
                }, 500);
            }
        }
    },
    
    // Store invite in localStorage
    storeInvite: function(invite) {
        try {
            // Get user info to check if this invite is for the current user
            const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
            
            // Check if this invite is for the current user
            if (invite.recipientId && invite.recipientId !== userInfo._id) {
                console.log(`Invite not for current user (${userInfo._id}), skipping storage`);
                return;
            }
            
            // Get existing invites
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                invites = JSON.parse(invitesStr);
                
                // Check if this invite already exists (by id or _id)
                const existingIndex = invites.findIndex(i => 
                    (invite.id && i.id === invite.id) || 
                    (invite._id && i._id === invite._id)
                );
                
                if (existingIndex >= 0) {
                    // Update existing invite
                    invites[existingIndex] = { ...invites[existingIndex], ...invite };
                    console.log('Updated existing invite in localStorage');
                } else {
                    // Add new invite
                    invites.push(invite);
                    console.log('Added new invite to localStorage');
                }
            } else {
                // Create new invites array
                invites = [invite];
                console.log('Created new invites array in localStorage');
            }
            
            // Save to localStorage
            localStorage.setItem('invites', JSON.stringify(invites));
            
            // Update notification badge
            this.updateNotificationBadge();
            
        } catch (err) {
            console.error('Error storing invite in localStorage:', err);
        }
    },
    
    // Show notification for new invite
    showNotification: function(title, message, type = 'info') {
        console.log(`[socket-handler.js] Showing notification: ${title} - ${message}`);
        
        // Add specific handling for message type notifications
        if (type === 'message') {
            // Check if the user allows notifications
            if ('Notification' in window && Notification.permission === 'granted') {
                // Create a system notification
                try {
                    const notificationOptions = {
                        body: message,
                        icon: '/resources/logo-icon.png'
                    };
                    
                    const notification = new Notification(title, notificationOptions);
                    
                    notification.onclick = function() {
                        window.focus();
                        // If the message contains the senderId, we can open the chat
                        if (this.tag && this.tag.includes('senderId:')) {
                            const senderId = this.tag.split('senderId:')[1];
                            if (senderId && typeof openFriendChat === 'function') {
                                openFriendChat(senderId, title.replace('Message from ', ''));
                            }
                        }
                    };
                } catch (e) {
                    console.error('Error creating notification:', e);
                    // Fall back to UI notification
                }
            }
        }
        
        // Continue with regular UI notification
        // Global notification deduplication
        if (!window.recentNotifications) {
            window.recentNotifications = new Set();
        }
        
        // Create a unique key for this notification
        const notificationKey = `${title}:${message}:${type}`;
        
        // Check if we've shown this notification recently (last 2 seconds)
        if (window.recentNotifications.has(notificationKey)) {
            console.log(`🚫 DUPLICATE NOTIFICATION BLOCKED: "${title} - ${message}"`);
            return;
        }
        
        // Add this notification to the recent set
        window.recentNotifications.add(notificationKey);
        
        // Remove it after 2 seconds to allow future notifications
        setTimeout(() => {
            window.recentNotifications.delete(notificationKey);
        }, 2000);
        
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
                
                // Add new status class if online
                if (status === 'online') {
                    statusEl.classList.add(status);
                    // Update text only if online
                    statusEl.innerHTML = `<i class="fas fa-circle"></i> Online`;
                } else {
                    // Clear the text if not online
                    statusEl.innerHTML = '';
                }
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
    
    // Store friend request in localStorage and sync with server
    storeFriendRequest: function(data) {
        try {
            console.log('Storing friend request and syncing with server:', data);
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
            
            // Check if this request already exists in localStorage
            const existingIndex = userInfo.friendRequests.received.findIndex(req => 
                (req.sender && req.sender._id === data.senderId) || 
                (req.sender === data.senderId) ||
                (req._id === data.requestId)
            );
            
            // Update localStorage - this is temporary until we sync with server
            if (existingIndex === -1) {
                userInfo.friendRequests.received.push(friendRequest);
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
            }
            
            // Always sync with server to ensure database is updated
            this.syncFriendRequestWithServer(friendRequest);
        } catch (error) {
            console.error('Error storing friend request:', error);
        }
    },
    
    // Sync friend request with server
    syncFriendRequestWithServer: function(friendRequest) {
        try {
            // Get authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Cannot sync friend request - not authenticated');
                return;
            }
            
            const url = `${window.APP_CONFIG.API_URL}/friends/sync-request`;
            
            // Send request to server
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestId: friendRequest._id,
                    senderId: friendRequest.sender,
                    senderName: friendRequest.senderName,
                    message: friendRequest.message
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Error syncing friend request');
                    });
                }
                return response.json();
            })
            .then(responseData => {
                console.log('Friend request synced with server:', responseData);
                
                // If server returns updated user info, update localStorage
                if (responseData.userInfo) {
                    // Get current user info to merge with server data
                    const currentUserInfo = this.getUserInfo();
                    
                    // Merge server friend requests with local
                    if (responseData.userInfo.friendRequests) {
                        currentUserInfo.friendRequests = responseData.userInfo.friendRequests;
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
                }
            })
            .catch(error => {
                console.error('Failed to sync friend request with server:', error);
            });
        } catch (error) {
            console.error('Error in syncFriendRequestWithServer:', error);
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
        console.log(`Accepting friend request ${requestId} from ${senderId} (${senderName})`);
        
        // Ensure we have the global deduplication set
        if (!window.processedFriendRequests) {
            window.processedFriendRequests = new Set();
        }
        
        // Mark this request as processed immediately to prevent duplicates
        if (requestId) {
            if (window.processedFriendRequests.has(requestId)) {
                console.log('🚫 DUPLICATE ACCEPTANCE! This request was already processed:', requestId);
                return;
            }
            window.processedFriendRequests.add(requestId);
            console.log('✨ Added request to processed set:', requestId);
        }
        
        // Construct URL based on whether we have a requestId
        const url = requestId 
            ? `/api/friends/accept/${requestId}`
            : '/api/friends/accept';
        
        // Prepare request body
        const body = { 
            senderId: senderId
        };
        
        // Get token for authorization
        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('You must be logged in to accept friend requests', 'error');
            return;
        }
        
        // Make request to accept friend request
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })
        .then(response => response.json())
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
                
                // Emit socket event if available with timestamp and source for deduplication
                if (this.socket) {
                    console.log(`Emitting friend-request-accepted event for ${senderId}`);
                    const timestamp = new Date().getTime();
                    this.socket.emit('friend-request-accepted', {
                        senderId: senderId,
                        acceptorName: this.getUserInfo()?.username || 'User',
                        timestamp: timestamp,
                        requestId: requestId,
                        source: 'client'
                    });
                    
                    // The requestId is already in the global processed set from when we started the acceptance
                    console.log(`✅ Sent socket notification for request ${requestId} acceptance`);
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
                this.showNotification('Error', data.message || 'Failed to accept friend request', 'error');
            }
        })
        .catch(error => {
            console.error('Error accepting friend request:', error);
            this.showNotification('Error', 'Failed to accept friend request. Please try again.', 'error');
        });
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
    
    // Handle friend request acceptance
    handleFriendRequestAccepted: function(data) {
        console.log('Processing friend request acceptance:', data);
        
        // Ensure we have the request ID for tracking
        const requestId = data.requestId || '';
        
        // Ensure the request is in our global processed set
        if (window.processedFriendRequests && !window.processedFriendRequests.has(requestId) && requestId) {
            window.processedFriendRequests.add(requestId);
            console.log('✅ Added request to global processed set from handler:', requestId);
        }
        
        // Show notification with appropriate text
        // This will be automatically deduplicated by our showNotification function
        console.log('Showing acceptance notification with data:', data);
        this.showNotification('Friend Request Accepted', `${data.username || data.acceptorName || 'User'} accepted your friend request!`);
        
        // Update UI if necessary
        // ...
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
    },

    // Send a private message to another user
    sendPrivateMessage: function(recipientId, message, messageId) {
        if (!this.socket || !this.isConnected) {
            console.error('[socket-handler.js] Cannot send message - socket not connected');
            return Promise.reject(new Error('Socket not connected'));
        }
        
        if (!recipientId || !message) {
            console.error('[socket-handler.js] Cannot send message - missing recipient ID or message content');
            return Promise.reject(new Error('Missing recipient ID or message content'));
        }
        
        return new Promise((resolve, reject) => {
            const messageData = {
                recipientId: recipientId,
                message: message,
                messageId: messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`
            };
            
            console.log('[socket-handler.js] Sending private message:', messageData);
            
            this.socket.emit('privateMessage', messageData, (response) => {
                if (response && response.success) {
                    console.log('[socket-handler.js] Message sent successfully:', response);
                    resolve(response);
                } else {
                    console.error('[socket-handler.js] Failed to send message:', response ? response.error : 'Unknown error');
                    reject(new Error(response ? response.error : 'Failed to send message'));
                }
            });
        });
    },
    
    // Load previous messages between current user and a friend
    loadPrivateMessages: function(friendId, limit = 50) {
        console.log('[socket-handler.js] loadPrivateMessages called for friend:', friendId);
        
        // Check if socket is initialized
        if (!this.socket) {
            console.error('[socket-handler.js] Cannot load messages - socket not initialized');
            return Promise.reject(new Error('Socket not initialized'));
        }
        
        // Check if socket is connected
        if (!this.socket.connected) {
            console.warn('[socket-handler.js] Socket not connected, attempting to connect');
            this.socket.connect();
            
            // Return a promise that will retry after connection
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (this.socket.connected) {
                        console.log('[socket-handler.js] Socket connected after retry, continuing to load messages');
                        // Now try to load messages again
                        this.loadPrivateMessages(friendId, limit)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        console.error('[socket-handler.js] Socket still not connected after retry');
                        reject(new Error('Socket connection failed'));
                    }
                }, 1000); // Wait 1 second for connection
            });
        }
        
        // Get user info for authentication
        const userInfo = this.getUserInfo();
        if (!userInfo || !userInfo._id) {
            console.error('[socket-handler.js] No user info available for loading messages');
            return Promise.reject(new Error('No user authentication data available'));
        }
        
        console.log('[socket-handler.js] User info found, checking authentication status');
        
        // Force re-authentication before loading messages to ensure we're properly authenticated
        return this.authenticate(userInfo._id)
            .then(() => {
                console.log('[socket-handler.js] Authentication successful, loading messages');
                
                return new Promise((resolve, reject) => {
                    // Increased timeout to 15 seconds to give server more time to respond
                    const timeout = setTimeout(() => {
                        console.error('[socket-handler.js] Request to load messages timed out');
                        reject(new Error('Request to load messages timed out'));
                    }, 15000);
                    
                    console.log('[socket-handler.js] Emitting loadPrivateMessages event to server');
                    this.socket.emit('loadPrivateMessages', { friendId, limit }, (response) => {
                        clearTimeout(timeout);
                        
                        if (response && response.success) {
                            console.log('[socket-handler.js] Messages loaded successfully:', response.messages.length);
                            resolve(response.messages);
                        } else {
                            const errorMsg = response && response.error ? response.error : 'Failed to load messages';
                            console.error('[socket-handler.js] Failed to load messages:', errorMsg);
                            reject(new Error(errorMsg));
                        }
                    });
                });
            })
            .catch(err => {
                console.error('[socket-handler.js] Authentication failed before loading messages:', err);
                return Promise.reject(new Error('Authentication failed: ' + err.message));
            });
    },
    
    // Subscribe to messages from a specific user
    subscribeToUser: function(userId) {
        if (!this.socket || !this.isConnected) {
            console.error('[socket-handler.js] Cannot subscribe - socket not connected');
            return false;
        }
        
        console.log('[socket-handler.js] Subscribing to messages from user:', userId);
        this.socket.emit('subscribeToUser', { userId });
        return true;
    },
    
    // Unsubscribe from a user's messages
    unsubscribeFromUser: function(userId) {
        if (!this.socket || !this.isConnected) {
            console.error('[socket-handler.js] Cannot unsubscribe - socket not connected');
            return false;
        }
        
        console.log('[socket-handler.js] Unsubscribing from user:', userId);
        this.socket.emit('unsubscribeFromUser', { userId });
        return true;
    },

    // Get user ID
    getUserId: function() {
        const userInfo = this.getUserInfo();
        return userInfo && userInfo._id ? userInfo._id : null;
    },
    
    // Check and repair socket connection
    checkConnection: function() {
        console.log('[socket-handler.js] Checking socket connection status...');
        
        return new Promise((resolve) => {
            // If socket doesn't exist at all, create it
            if (!this.socket) {
                console.log('[socket-handler.js] No socket instance exists, creating one');
                this.setupSocket();
                resolve({
                    status: 'initialized',
                    connected: false,
                    message: 'Socket initialized, waiting for connection'
                });
                return;
            }
            
            // If socket exists but is not connected
            if (!this.socket.connected) {
                console.log('[socket-handler.js] Socket exists but not connected, reconnecting');
                this.reconnect();
                
                // Wait a bit to see if connection succeeds
                setTimeout(() => {
                    if (this.socket.connected) {
                        console.log('[socket-handler.js] Reconnection successful');
                        resolve({
                            status: 'reconnected',
                            connected: true,
                            message: 'Reconnection successful'
                        });
                    } else {
                        console.log('[socket-handler.js] Reconnection in progress');
                        resolve({
                            status: 'connecting',
                            connected: false,
                            message: 'Reconnection in progress'
                        });
                    }
                }, 1000);
                return;
            }
            
            // Socket is connected, check authentication
            this.isAuthenticated().then(authenticated => {
                if (!authenticated) {
                    console.log('[socket-handler.js] Socket connected but not authenticated, authenticating');
                    const userId = this.getUserId();
                    if (userId) {
                        this.authenticate(userId)
                            .then(() => {
                                resolve({
                                    status: 'reauthenticated',
                                    connected: true,
                                    message: 'Socket reauthenticated'
                                });
                            })
                            .catch(error => {
                                console.error('[socket-handler.js] Authentication failed:', error);
                                resolve({
                                    status: 'auth_failed',
                                    connected: true,
                                    message: 'Socket connected but authentication failed'
                                });
                            });
                    } else {
                        resolve({
                            status: 'no_user',
                            connected: true,
                            message: 'Socket connected but no user ID available for authentication'
                        });
                    }
                } else {
                    // All good
                    resolve({
                        status: 'connected',
                        connected: true,
                        authenticated: true,
                        message: 'Socket connected and authenticated'
                    });
                }
            }).catch(error => {
                console.error('[socket-handler.js] Error checking authentication:', error);
                resolve({
                    status: 'error',
                    connected: true,
                    message: 'Error checking authentication'
                });
            });
        });
    }
};

// Initialize SocketHandler when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing SocketHandler...');
    
    // Check if SocketHandler is already initialized
    if (window.SocketHandler && window.SocketHandler.socket) {
        console.log('SocketHandler already initialized, skipping initialization');
        return;
    }
    
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