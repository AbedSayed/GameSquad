// Friends Service for GameSquad
// Manages friends data, storage, and UI updates

const FriendsService = {
    // Initialize the service
    init: function() {
        console.log('Initializing FriendsService');
        this.loadFriends();
        this.loadFriendRequests();
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
            // Get from userInfo first - this is most accurate
            const userInfo = this.getUserInfo();
            if (userInfo && userInfo.friends && Array.isArray(userInfo.friends)) {
                console.log('Loading friends from userInfo:', userInfo.friends);
                this.friends = userInfo.friends;
                return this.friends;
            }
            
            // Try to get from localStorage
            let friends = [];
            const friendsStr = localStorage.getItem('friends');
            
            if (friendsStr) {
                friends = JSON.parse(friendsStr);
                console.log('Loaded friends from localStorage:', friends);
                
                // If we have friends in localStorage, use them for now
                if (friends.length > 0) {
                    this.friends = friends;
                    return friends;
                }
            }
            
            // If not in localStorage or empty, fetch from API
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
    loadFriendRequests: function() {
        try {
            // Get from userInfo
            const userInfo = this.getUserInfo();
            if (userInfo && userInfo.friendRequests) {
                console.log('Loading friend requests from userInfo:', userInfo.friendRequests);
                this.friendRequests = userInfo.friendRequests;
                return this.friendRequests;
            }
            
            // Default empty structure
            this.friendRequests = { sent: [], received: [] };
            return this.friendRequests;
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
            const response = await fetch('/api/users/friends', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friends: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Fetched friends from API:', data);
            
            // Store to localStorage
            localStorage.setItem('friends', JSON.stringify(data));
            
            return data;
        } catch (error) {
            console.error('Error fetching friends from API:', error);
            
            // No sample friends - use empty array if API fails
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
            const response = await fetch('/api/users/friends/requests', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch friend requests: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Fetched friend requests from API:', data);
            
            // Update the user info
            const userInfo = this.getUserInfo();
            if (userInfo) {
                userInfo.friendRequests = data;
                localStorage.setItem('userInfo', JSON.stringify(userInfo));
            }
            
            // Update local data
            this.friendRequests = data;
            
            return data;
        } catch (error) {
            console.error('Error fetching friend requests from API:', error);
            return this.friendRequests || { sent: [], received: [] };
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
        const friendName = userData.username;
        
        try {
            // Try to send via API
            const token = localStorage.getItem('token');
            if (token) {
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const response = await fetch(`${apiUrl}/users/friends/request/${friendId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        message: `Would you like to be friends?`
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Friend request sent via API:', data);
                    
                    // Update user info in localStorage with the returned data
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
                    // Update local requests
                    this.loadFriendRequests();
                    
                    return { success: true, message: 'Friend request sent successfully' };
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to send friend request');
                }
            } else {
                throw new Error('Not authenticated');
            }
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
            if (token) {
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                const response = await fetch(`${apiUrl}/users/friends/accept/${requestId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Friend request accepted via API:', data);
                    
                    // Update user info in localStorage with the returned data
                    if (data.userInfo) {
                        localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                    }
                    
                    // Reload friends and requests
                    this.loadFriends();
                    this.loadFriendRequests();
                    
                    return { success: true, message: 'Friend request accepted' };
                } else {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to accept friend request');
                }
            } else {
                throw new Error('Not authenticated');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            throw error;
        }
    },
    
    // Add a new friend
    addFriend: async function(friendData) {
        console.log('addFriend is deprecated. Use sendFriendRequest instead.');
        return this.sendFriendRequest(friendData);
    },
    
    // Remove a friend
    removeFriend: async function(friendId) {
        if (!this.friends) return false;
        
        try {
            // Remove from API first
            const token = localStorage.getItem('token');
            if (token) {
                const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                try {
                    const response = await fetch(`${apiUrl}/users/friends/remove/${friendId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Friend removed via API:', data);
                        
                        // Update user info in localStorage with the returned data
                        if (data.userInfo) {
                            localStorage.setItem('userInfo', JSON.stringify(data.userInfo));
                        }
                        
                        // Reload friends
                        this.loadFriends();
                        
                        return true;
                    } else {
                        const error = await response.json();
                        throw new Error(error.message || 'Failed to remove friend');
                    }
                } catch (apiError) {
                    console.error('Error removing friend via API:', apiError);
                    throw apiError;
                }
            } else {
                throw new Error('Not authenticated');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            return false;
        }
    },
    
    // Get all friends
    getAllFriends: function() {
        return this.friends || [];
    },
    
    // Get pending friend requests
    getPendingRequests: function() {
        if (!this.friendRequests) return { sent: [], received: [] };
        return this.friendRequests;
    },
    
    // Get online friends
    getOnlineFriends: function() {
        if (!this.friends) return [];
        return this.friends.filter(friend => 
            (friend.status === 'online') || 
            (friend.profile && friend.profile.status === 'online')
        );
    },
    
    // Check for new friend requests
    checkForNewRequests: async function() {
        await this.fetchFriendRequestsFromAPI();
        
        // Return any pending received requests
        return this.friendRequests && this.friendRequests.received 
            ? this.friendRequests.received.filter(req => req.status === 'pending')
            : [];
    }
};

// Make available globally
window.FriendsService = FriendsService;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    FriendsService.init();
}); 