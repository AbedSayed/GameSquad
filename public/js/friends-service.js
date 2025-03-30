// Friends Service for GameSquad
// Manages friends data, storage, and UI updates

const FriendsService = {
    // Track if service has been initialized
    initialized: false,
    
    // Initialize the service
    init: function() {
        console.log('Initializing FriendsService');
        
        // Initialize data structures
        this.friends = [];
        this.friendRequests = { sent: [], received: [] };
        
        // Clean up any invalid requests right away
        this.cleanupInvalidRequests();
        
        // Load friends and friend requests
        this.loadFriends();
        this.loadFriendRequests();
        
        // Set up socket listeners
        this.setupSocketListeners();
        
        // Mark as initialized
        this.initialized = true;
        console.log('FriendsService initialized successfully');
        
        return this;
    },
    
    // Get current user info
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
    
    // Get all friends
    getAllFriends: function() {
        // First try to use the local property
        if (this.friends && Array.isArray(this.friends)) {
            return this.friends;
        }
        
        // If not available, try to get from localStorage
        try {
            const friendsStr = localStorage.getItem('friends');
            if (friendsStr) {
                return JSON.parse(friendsStr);
            }
            
            // If still not available, try to get from userInfo
            const userInfo = this.getUserInfo();
            if (userInfo && userInfo.friends) {
                return userInfo.friends;
            }
        } catch (err) {
            console.error('Error getting friends:', err);
        }
        
        return [];
    },
    
    // Get all pending friend requests
    getPendingRequests: function() {
        // First try to use the local property
        if (this.friendRequests) {
            return this.friendRequests;
        }
        
        // If not available, try to get from userInfo
        try {
            const userInfo = this.getUserInfo();
            if (userInfo && userInfo.friendRequests) {
                return userInfo.friendRequests;
            }
        } catch (err) {
            console.error('Error getting friend requests:', err);
        }
        
        return { sent: [], received: [] };
    },
    
    // Load friends from local storage or API
    loadFriends: async function() {
        try {
            // Try to get from localStorage
            let friends = [];
            const friendsStr = localStorage.getItem('friends');
            
            if (friendsStr) {
                friends = JSON.parse(friendsStr);
                console.log('Loaded friends from localStorage:', friends);
                
                // If we have friends in localStorage, use them for now
                if (friends.length > 0) {
                    this.friends = friends;
                }
            }
            
            // Always fetch from API to get the latest
            console.log('Fetching friends from API');
            friends = await this.fetchFriendsFromAPI();
            this.friends = friends;
            return friends;
        } catch (err) {
            console.error('Error loading friends:', err);
            this.friends = [];
            return [];
        }
    },
    
    // Load friend requests
    loadFriendRequests: async function() {
        try {
            // Always fetch from API to get the latest
            console.log('Fetching friend requests from API');
            const requests = await this.fetchFriendRequestsFromAPI();
            
            // Filter out invalid requests before storing
            const filteredRequests = this.filterInvalidRequests(requests);
            this.friendRequests = filteredRequests;
            
            return filteredRequests;
        } catch (err) {
            console.error('Error loading friend requests:', err);
            this.friendRequests = { sent: [], received: [] };
            return this.friendRequests;
        }
    },
    
    // Filter out invalid friend requests
    filterInvalidRequests: function(requests) {
        const result = {
            sent: [],
            received: []
        };
        
        // Filter received requests - remove any with missing/invalid sender info
        if (requests.received && Array.isArray(requests.received)) {
            result.received = requests.received.filter(request => {
                // Check for valid sender data
                const hasSender = request.sender && 
                                (typeof request.sender === 'object' ? 
                                    (request.sender._id && request.sender.username && request.sender.username !== 'Unknown User') : 
                                    request.sender);
                
                const hasSenderName = request.senderName && request.senderName !== 'Unknown User';
                
                return hasSender || hasSenderName;
            });
        }
        
        // Keep sent requests as is
        if (requests.sent && Array.isArray(requests.sent)) {
            result.sent = requests.sent;
        }
        
        console.log(`Filtered out ${(requests.received?.length || 0) - (result.received?.length || 0)} invalid friend requests`);
        return result;
    },
    
    // Clean up invalid requests from localStorage
    cleanupLocalStorage: function() {
        try {
            const userInfo = this.getUserInfo();
            if (!userInfo || !userInfo.friendRequests) {
                return;
            }
            
            // Store original counts for logging
            const originalReceivedCount = userInfo.friendRequests.received?.length || 0;
            
            // Filter out invalid requests
            if (userInfo.friendRequests.received) {
                userInfo.friendRequests.received = userInfo.friendRequests.received.filter(request => {
                    const hasSender = request.sender && 
                                    (typeof request.sender === 'object' ? 
                                        (request.sender._id && request.sender.username && request.sender.username !== 'Unknown User') : 
                                        request.sender);
                    
                    const hasSenderName = request.senderName && request.senderName !== 'Unknown User';
                    
                    return hasSender || hasSenderName;
                });
            }
            
            // Log how many were removed
            const newReceivedCount = userInfo.friendRequests.received?.length || 0;
            if (originalReceivedCount !== newReceivedCount) {
                console.log(`Cleaned up ${originalReceivedCount - newReceivedCount} invalid friend requests from localStorage`);
                
                // Update localStorage
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
            }
        } catch (err) {
            console.error('Error cleaning up localStorage:', err);
        }
    },
    
    // Fetch friends from API
    fetchFriendsFromAPI: async function() {
        // Get token for authentication
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Cannot fetch friends - not authenticated');
            return [];
        }
        
        try {
            console.log('Fetching friends from API...');
            const response = await fetch('/api/friends', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to fetch friends: ${response.status}`, errorText);
                throw new Error(`Failed to fetch friends: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Fetched friends from API:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Error fetching friends');
            }
            
            // Ensure we have a valid array of friends
            let friends = result.data || [];
            if (!Array.isArray(friends)) {
                console.warn('API returned non-array friends data, converting to array');
                friends = Array.isArray(result.data) ? result.data : [];
            }
            
            // Process friends data to ensure each item has necessary properties
            const processedFriends = friends.map(friend => {
                if (typeof friend === 'string') {
                    // If friend is just an ID, convert to object
                    return { _id: friend, username: `User ${friend.substring(0, 5)}` };
                }
                
                // Ensure the friend object has _id and username
                const processedFriend = { ...friend };
                if (!processedFriend.username && processedFriend._id) {
                    processedFriend.username = `User ${processedFriend._id.substring(0, 5)}`;
                }
                
                return processedFriend;
            });
            
            // Store to localStorage
            localStorage.setItem('friends', JSON.stringify(processedFriends));
            
            // Update the instance property
            this.friends = processedFriends;
            
            return processedFriends;
        } catch (error) {
            console.error('Error fetching friends from API:', error);
            // Try to get from localStorage as fallback
            try {
                const friendsStr = localStorage.getItem('friends');
                if (friendsStr) {
                    const storedFriends = JSON.parse(friendsStr);
                    if (Array.isArray(storedFriends) && storedFriends.length > 0) {
                        console.log('Using cached friends from localStorage');
                        return storedFriends;
                    }
                }
            } catch (e) {
                console.error('Error reading friends from localStorage:', e);
            }
            
            return [];
        }
    },
    
    // Fetch friend requests from API
    fetchFriendRequestsFromAPI: async function() {
        // Get token for authentication
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Cannot fetch friend requests - not authenticated');
            return { sent: [], received: [] };
        }
        
        try {
            const response = await fetch('/api/friends/requests', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friend requests: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Fetched friend requests from API:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Error fetching friend requests');
            }
            
            const requests = result.data || { sent: [], received: [] };
            
            // Update local data
            this.friendRequests = requests;
            
            return requests;
        } catch (error) {
            console.error('Error fetching friend requests from API:', error);
            return { sent: [], received: [] };
        }
    },
    
    // Get a specific friend by ID
    getFriendById: function(friendId) {
        if (!this.friends) return null;
        return this.friends.find(friend => 
            friend._id === friendId || friend.id === friendId ||
            (typeof friend === 'string' && friend === friendId)
        );
    },
    
    // Send a friend request
    sendFriendRequest: async function(userData) {
        // Validate required fields
        if (!userData.id && !userData._id) {
            throw new Error('Friend ID is required');
        }
        
        const friendId = userData.id || userData._id;
        
        try {
            // Get authentication token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            // Send friend request via API
            const response = await fetch(`/api/friends/request/${friendId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: `Would you like to be friends?`
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send friend request');
            }
            
            const data = await response.json();
            console.log('Friend request sent via API:', data);
            
            // Reload friend requests to get updated data
            await this.loadFriendRequests();
            
            return { success: true, message: 'Friend request sent successfully', requestId: data.requestId };
        } catch (error) {
            console.error('Error sending friend request:', error);
            throw error;
        }
    },
    
    // Accept a friend request
    acceptFriendRequest: async function(requestId) {
        try {
            // Accept via API
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`/api/friends/accept/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to accept friend request');
            }
            
            const data = await response.json();
            console.log('Friend request accepted via API:', data);
            
            // Reload friends and requests
            await this.loadFriends();
            await this.loadFriendRequests();
            
            return { success: true, message: 'Friend request accepted successfully' };
        } catch (error) {
            console.error('Error accepting friend request:', error);
            throw error;
        }
    },
    
    // Reject a friend request
    rejectFriendRequest: async function(requestId) {
        try {
            // Reject via API
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`/api/friends/reject/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to reject friend request');
            }
            
            const data = await response.json();
            console.log('Friend request rejected via API:', data);
            
            // Reload requests
            await this.loadFriendRequests();
            
            return { success: true, message: 'Friend request rejected successfully' };
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            throw error;
        }
    },
    
    // Remove a friend
    removeFriend: async function(friendId) {
        try {
            // Remove via API
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`/api/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to remove friend');
            }
            
            const data = await response.json();
            console.log('Friend removed via API:', data);
            
            // Reload friends
            await this.loadFriends();
            
            return { success: true, message: 'Friend removed successfully' };
        } catch (error) {
            console.error('Error removing friend:', error);
            throw error;
        }
    },
    
    // Setup Socket.IO listeners for friend-related events
    setupSocketListeners: function() {
        const socket = window.socket;
        if (!socket) {
            console.warn('Socket not available for friend events');
            return;
        }
        
        // Listen for new friend requests
        socket.on('new-friend-request', async (data) => {
            console.log('Received new friend request:', data);
            
            // Check if this request is for the current user
            const userInfo = this.getUserInfo();
            if (!userInfo || !userInfo._id) return;
            
            const recipientId = data.recipientId;
            if (recipientId !== userInfo._id) {
                console.log('Friend request not for this user, ignoring');
                return;
            }
            
            // Show notification to user
            this.showFriendRequestNotification(data);
            
            // Reload friend requests
            await this.loadFriendRequests();
        });
        
        // Listen for friend request accepted with deduplication
        socket.on('friend-request-accepted', async (data) => {
            console.log('Friend request accepted:', data);
            
            // Check for duplicates using timestamp and requestId
            const eventId = `${data.requestId || ''}:${data.timestamp || ''}:${data.source || ''}`;
            
            if (this.processedEvents.has(eventId)) {
                console.log('Ignoring duplicate friend acceptance notification:', eventId);
                return;
            }
            
            // Add to processed events set
            this.processedEvents.add(eventId);
            
            // Limit size of set to prevent memory issues
            if (this.processedEvents.size > 50) {
                const iterator = this.processedEvents.values();
                this.processedEvents.delete(iterator.next().value);
            }
            
            // Reload friends
            await this.loadFriends();
            await this.loadFriendRequests();
            
            // Show notification
            this.showFriendRequestAcceptedNotification(data);
        });
        
        // Listen for friend request rejected (if implemented)
        socket.on('friend-request-rejected', (data) => {
            console.log('Friend request rejected:', data);
            
            // Reload friend requests
            this.loadFriendRequests();
        });
        
        // Listen for friend removed (if implemented)
        socket.on('friend-removed', (data) => {
            console.log('Friend removed:', data);
            
            // Reload friends
            this.loadFriends();
        });
    },
    
    // Show notification for new friend request
    showFriendRequestNotification: function(data) {
        // Show notification using the site's notification system
        if (window.NotificationService) {
            window.NotificationService.show({
                title: 'New Friend Request',
                message: `${data.senderName} wants to be your friend!`,
                type: 'info',
                duration: 5000,
                onClick: () => {
                    // Redirect to friends page or open friends modal
                    if (window.location.pathname !== '/friends.html') {
                        window.location.href = '/friends.html';
                    }
                }
            });
        } else {
            // Fallback to alert if no notification service
            alert(`New friend request from ${data.senderName}!`);
        }
    },
    
    // Show notification for accepted friend request
    showFriendRequestAcceptedNotification: function(data) {
        // Show notification using the site's notification system
        if (window.NotificationService) {
            window.NotificationService.show({
                title: 'Friend Request Accepted',
                message: `${data.acceptedByName} accepted your friend request!`,
                type: 'success',
                duration: 5000
            });
        }
    },
    
    // Update the UI with friends list
    renderFriendsList: function(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        if (!this.friends || this.friends.length === 0) {
            container.innerHTML = '<div class="no-friends">You don\'t have any friends yet. Search for users to add friends!</div>';
            return;
        }
        
        // Create HTML for friends list
        const friendsHTML = this.friends.map(friend => {
            const friendName = friend.username || 'Unknown User';
            return `
                <div class="friend-item" data-id="${friend._id}">
                    <div class="friend-avatar">
                        <img src="${friend.avatar || '/assets/default-avatar.png'}" alt="${friendName}" />
                    </div>
                    <div class="friend-info">
                        <div class="friend-name">${friendName}</div>
                        <div class="friend-status ${friend.isOnline ? 'online' : 'offline'}">
                            ${friend.isOnline ? 'Online' : 'Offline'}
                        </div>
                    </div>
                    <div class="friend-actions">
                        <button class="btn-message" data-id="${friend._id}">Message</button>
                        <button class="btn-remove-friend" data-id="${friend._id}">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = friendsHTML;
        
        // Add event listeners
        container.querySelectorAll('.btn-message').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const friendId = e.target.dataset.id;
                // Open chat with this friend (implement this function)
                if (window.ChatService) {
                    window.ChatService.openPrivateChat(friendId);
                }
            });
        });
        
        container.querySelectorAll('.btn-remove-friend').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const friendId = e.target.dataset.id;
                if (confirm('Are you sure you want to remove this friend?')) {
                    try {
                        await this.removeFriend(friendId);
                        this.renderFriendsList(containerSelector);
                    } catch (error) {
                        alert(`Error removing friend: ${error.message}`);
                    }
                }
            });
        });
    },
    
    // Update the UI with friend requests
    renderFriendRequests: function(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const requests = this.friendRequests?.received || [];
        
        if (requests.length === 0) {
            container.innerHTML = '<div class="no-requests">You don\'t have any pending friend requests.</div>';
            return;
        }
        
        // Create HTML for friend requests
        const requestsHTML = requests
            .filter(req => req.status === 'pending')
            .map(request => {
                const senderName = request.sender?.username || 'Unknown User';
                return `
                    <div class="request-item" data-id="${request._id}">
                        <div class="request-avatar">
                            <img src="${request.sender?.avatar || '/assets/default-avatar.png'}" alt="${senderName}" />
                        </div>
                        <div class="request-info">
                            <div class="request-name">${senderName}</div>
                            <div class="request-message">${request.message || 'Wants to be your friend'}</div>
                        </div>
                        <div class="request-actions">
                            <button class="btn-accept" data-id="${request._id}">Accept</button>
                            <button class="btn-reject" data-id="${request._id}">Reject</button>
                        </div>
                    </div>
                `;
            }).join('');
        
        container.innerHTML = requestsHTML;
        
        // Add event listeners
        container.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const requestId = e.target.dataset.id;
                try {
                    await this.acceptFriendRequest(requestId);
                    this.renderFriendRequests(containerSelector);
                    this.renderFriendsList('#friends-list'); // Update friends list too
                } catch (error) {
                    alert(`Error accepting friend request: ${error.message}`);
                }
            });
        });
        
        container.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const requestId = e.target.dataset.id;
                try {
                    await this.rejectFriendRequest(requestId);
                    this.renderFriendRequests(containerSelector);
                } catch (error) {
                    alert(`Error rejecting friend request: ${error.message}`);
                }
            });
        });
    },
    
    cleanupInvalidRequests: function() {
        try {
            console.log('Cleaning up invalid friend requests');
            
            // Get from localStorage
            const userInfoStr = localStorage.getItem('userInfo');
            if (!userInfoStr) return;
            
            const userInfo = JSON.parse(userInfoStr);
            
            if (!userInfo.friendRequests) return;
            
            let invalidRequestsRemoved = 0;
            
            // Clean up received requests - filter out Unknown User and missing sender info
            if (userInfo.friendRequests.received && Array.isArray(userInfo.friendRequests.received)) {
                const originalCount = userInfo.friendRequests.received.length;
                
                userInfo.friendRequests.received = userInfo.friendRequests.received.filter(request => {
                    // Check for valid sender info
                    const hasValidSender = request.sender && 
                        (typeof request.sender === 'object' ? 
                            (request.sender.username && request.sender.username !== 'Unknown User') : 
                            true);
                    
                    // Check for valid sender name
                    const hasValidSenderName = request.senderName && 
                        request.senderName !== 'Unknown User';
                    
                    return hasValidSender || hasValidSenderName;
                });
                
                invalidRequestsRemoved = originalCount - userInfo.friendRequests.received.length;
            }
            
            if (invalidRequestsRemoved > 0) {
                console.log(`Removed ${invalidRequestsRemoved} invalid friend requests`);
                
                // Save back to localStorage
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
            }
        } catch (error) {
            console.error('Error cleaning up invalid friend requests:', error);
        }
    },
    
    // Function to refresh friends list
    refreshFriends: async function() {
        try {
            console.log('Refreshing friends list...');
            
            // Fetch fresh data from API
            const friends = await this.fetchFriendsFromAPI();
            
            // Deduplicate friends array
            const uniqueFriends = this.deduplicateFriends(friends);
            
            // Update local cache
            this.friends = uniqueFriends;
            
            // Update localStorage
            localStorage.setItem('friends', JSON.stringify(uniqueFriends));
            
            return uniqueFriends;
        } catch (error) {
            console.error('Error refreshing friends:', error);
            return this.friends || [];
        }
    },
    
    // Helper function to deduplicate friends array
    deduplicateFriends: function(friends) {
        if (!Array.isArray(friends)) return [];
        
        const uniqueFriends = [];
        const seenIds = new Set();
        
        for (const friend of friends) {
            if (!friend) continue;
            
            const friendId = friend._id || friend.id;
            if (!friendId) continue;
            
            // Convert to string for consistent comparison
            const idStr = String(friendId);
            
            if (!seenIds.has(idStr)) {
                seenIds.add(idStr);
                uniqueFriends.push(friend);
            } else {
                console.log(`[FriendsService] Removed duplicate friend with ID: ${idStr}`);
            }
        }
        
        console.log(`[FriendsService] Deduplication: ${friends.length} friends reduced to ${uniqueFriends.length} unique friends`);
        return uniqueFriends;
    },
    
    // Add this property near the top of the FriendsService object
    processedEvents: new Set(),
};

// Export the service
window.FriendsService = FriendsService;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    FriendsService.init();
}); 