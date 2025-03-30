// Friends Service for GameSquad
// Manages friends data, storage, and UI updates

const FriendsService = {
    // Initialize the service
    init: function() {
        console.log('Initializing FriendsService');
        this.loadFriends();
        this.loadFriendRequests();
        this.setupSocketListeners();
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
            this.friendRequests = requests;
            return requests;
        } catch (err) {
            console.error('Error loading friend requests:', err);
            this.friendRequests = { sent: [], received: [] };
            return this.friendRequests;
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
            const response = await fetch('/api/friends', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friends: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Fetched friends from API:', result);
            
            if (!result.success) {
                throw new Error(result.message || 'Error fetching friends');
            }
            
            const friends = result.data || [];
            
            // Store to localStorage
            localStorage.setItem('friends', JSON.stringify(friends));
            
            return friends;
        } catch (error) {
            console.error('Error fetching friends from API:', error);
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
            // Try to send via API
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated');
            }
            
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
        
        // Listen for friend request accepted
        socket.on('friend-request-accepted', async (data) => {
            console.log('Friend request accepted:', data);
            
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
    }
};

// Export the service
window.FriendsService = FriendsService;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    FriendsService.init();
}); 