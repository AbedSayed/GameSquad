// Socket connection handler for GameSquad
const SocketHandler = {
    socket: null,
    
    // Initialize socket connection
    init: function() {
        if (!window.io) {
            console.error('Socket.io not loaded');
            return;
        }
        
        this.socket = io();
        
        // Set up event listeners
        this.setupListeners();
        
        // Authenticate if user is logged in
        const userInfo = this.getUserInfo();
        if (userInfo && userInfo._id) {
            this.authenticate(userInfo._id);
        }
        
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
        if (!this.socket) return;
        
        this.socket.emit('authenticate', { userId });
        console.log('Socket authentication sent for user:', userId);
    },
    
    // Set up all socket event listeners
    setupListeners: function() {
        if (!this.socket) return;
        
        // Authentication response
        this.socket.on('authenticated', (data) => {
            console.log('Socket authenticated:', data);
        });
        
        // New invite notification
        this.socket.on('new-invite', (invite) => {
            console.log('New invite received:', invite);
            this.handleNewInvite(invite);
        });
        
        // Other socket events...
    },
    
    // Handle new invite
    handleNewInvite: function(invite) {
        // Store invite in localStorage
        this.storeInvite(invite);
        
        // Show notification
        this.showInviteNotification(invite);
        
        // Update invites UI if on messages page
        if (window.location.href.includes('messages.html') || 
            window.location.href.includes('profile.html')) {
            this.updateInvitesUI();
        }
    },
    
    // Store invite in localStorage
    storeInvite: function(invite) {
        try {
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                invites = JSON.parse(invitesStr);
            }
            
            // Add new invite
            invites.push(invite);
            
            // Store back in localStorage
            localStorage.setItem('invites', JSON.stringify(invites));
        } catch (err) {
            console.error('Error storing invite:', err);
        }
    },
    
    // Show notification for new invite
    showInviteNotification: function(invite) {
        const Notification = window.Notification || {};
        
        // UI notification
        if (typeof showNotification === 'function') {
            showNotification(
                'New Invite', 
                `${invite.senderName} invited you to join "${invite.lobbyName}"`, 
                'info'
            );
        }
        
        // Browser notification if available and permitted
        if (Notification && Notification.permission === 'granted') {
            new Notification('GameSquad Invite', {
                body: `${invite.senderName} invited you to join "${invite.lobbyName}"`,
                icon: '/images/logo.png'
            });
        }
    },
    
    // Update invites UI on messages page
    updateInvitesUI: function() {
        const invitesContainer = document.getElementById('invites-container');
        if (!invitesContainer) return;
        
        try {
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                invites = JSON.parse(invitesStr);
            }
            
            // Clear container
            invitesContainer.innerHTML = '';
            
            if (invites.length === 0) {
                invitesContainer.innerHTML = '<div class="empty-state">No invites</div>';
                return;
            }
            
            // Add each invite to UI
            invites.forEach(invite => {
                const inviteEl = document.createElement('div');
                inviteEl.className = 'invite-item';
                inviteEl.dataset.id = invite.id;
                
                const time = new Date(invite.timestamp).toLocaleTimeString();
                const date = new Date(invite.timestamp).toLocaleDateString();
                
                inviteEl.innerHTML = `
                    <div class="invite-header">
                        <span class="invite-game">${invite.gameType}</span>
                        <span class="invite-time">${time} ${date}</span>
                    </div>
                    <div class="invite-body">
                        <p>${invite.senderName} invited you to join "${invite.lobbyName}"</p>
                    </div>
                    <div class="invite-actions">
                        <button class="btn accept-invite" data-lobby-id="${invite.lobbyId}">Accept</button>
                        <button class="btn reject-invite">Decline</button>
                    </div>
                `;
                
                invitesContainer.appendChild(inviteEl);
            });
            
            // Add event listeners to buttons
            this.addInviteButtonListeners();
        } catch (err) {
            console.error('Error updating invites UI:', err);
        }
    },
    
    // Add event listeners to invite buttons
    addInviteButtonListeners: function() {
        // Accept invite buttons
        document.querySelectorAll('.accept-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lobbyId = e.target.dataset.lobbyId;
                const inviteId = e.target.closest('.invite-item').dataset.id;
                
                if (lobbyId) {
                    window.location.href = `/pages/lobby.html?id=${lobbyId}&join=true`;
                    
                    // Remove invite from storage
                    this.removeInvite(inviteId);
                }
            });
        });
        
        // Reject invite buttons
        document.querySelectorAll('.reject-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inviteId = e.target.closest('.invite-item').dataset.id;
                this.removeInvite(inviteId);
                this.updateInvitesUI();
            });
        });
    },
    
    // Remove invite from localStorage
    removeInvite: function(inviteId) {
        try {
            let invites = [];
            const invitesStr = localStorage.getItem('invites');
            
            if (invitesStr) {
                invites = JSON.parse(invitesStr);
                invites = invites.filter(invite => invite.id !== inviteId);
                localStorage.setItem('invites', JSON.stringify(invites));
            }
        } catch (err) {
            console.error('Error removing invite:', err);
        }
    }
};

// Initialize SocketHandler when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    SocketHandler.init();
    
    // If on messages page, update invites UI
    if (window.location.href.includes('messages.html') || 
        window.location.href.includes('profile.html')) {
        SocketHandler.updateInvitesUI();
    }
}); 