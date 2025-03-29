// Messages page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    initTabs();
    
    // Initialize notification handling
    initNotifications();
    
    // Ensure the user is logged in
    requireLogin();
    
    // Display user's invites on page load
    displayUserInvites();
});

// Function to initialize tab switching
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding tab content
            const tabName = button.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Function to initialize notification handling
function initNotifications() {
    const notification = document.getElementById('notification');
    const closeBtn = document.querySelector('.notification-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
        });
    }
}

// Function to check if user is logged in, redirect if not
function requireLogin() {
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
        window.location.href = '../index.html';
        return;
    }
    
    try {
        const userInfo = JSON.parse(userInfoStr);
        if (!userInfo || !userInfo._id) {
            window.location.href = '../index.html';
            return;
        }
        
        // Update profile link with username if available
        const profileLink = document.getElementById('profile-link');
        if (profileLink && userInfo.username) {
            profileLink.textContent = userInfo.username;
        }
        
        // Set up logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    } catch (e) {
        console.error('Error parsing user info:', e);
        window.location.href = '../index.html';
    }
}

// Function to log out the user
function logout() {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    showNotification('Logout successful', 'You have been logged out successfully');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1000);
}

// Function to display stored invites for the current user
function displayUserInvites() {
    try {
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
                invite.recipientId === userId || invite.recipientId === userInfo._id.toString()
            );
        }
        
        // Get the invites container
        const invitesContainer = document.getElementById('invites-container');
        if (!invitesContainer) return;
        
        // Clear container
        invitesContainer.innerHTML = '';
        
        if (invites.length === 0) {
            invitesContainer.innerHTML = '<div class="empty-state">No invites</div>';
            return;
        }
        
        // Sort invites by date (newest first)
        invites.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Add each invite to UI
        invites.forEach(invite => {
            const inviteEl = document.createElement('div');
            inviteEl.className = 'invite-item';
            inviteEl.dataset.id = invite.id;
            
            const time = new Date(invite.timestamp).toLocaleTimeString();
            const date = new Date(invite.timestamp).toLocaleDateString();
            
            inviteEl.innerHTML = `
                <div class="invite-header">
                    <span class="invite-game">${invite.gameType || 'Game'}</span>
                    <span class="invite-time">${time} ${date}</span>
                </div>
                <div class="invite-body">
                    <p>${invite.senderName} invited you to join "${invite.lobbyName}"</p>
                    <p>${invite.message || ''}</p>
                </div>
                <div class="invite-actions">
                    <button class="btn accept-invite" data-lobby-id="${invite.lobbyId}">Accept</button>
                    <button class="btn reject-invite">Decline</button>
                </div>
            `;
            
            invitesContainer.appendChild(inviteEl);
        });
        
        // Add event listeners to buttons
        addInviteButtonListeners();
    } catch (err) {
        console.error('Error displaying invites:', err);
        showNotification('Error', 'Could not load invites');
    }
}

// Function to add event listeners to invite buttons
function addInviteButtonListeners() {
    // Accept invite buttons
    document.querySelectorAll('.accept-invite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lobbyId = e.target.dataset.lobbyId;
            const inviteItem = e.target.closest('.invite-item');
            const inviteId = inviteItem ? inviteItem.dataset.id : null;
            
            if (lobbyId && inviteId) {
                // Show notification
                showNotification('Joining Lobby', 'Redirecting to lobby...');
                
                // Remove invite from storage
                removeInvite(inviteId);
                
                // Redirect to lobby page
                setTimeout(() => {
                    window.location.href = `/pages/lobby.html?id=${lobbyId}&join=true`;
                }, 500);
            }
        });
    });
    
    // Reject invite buttons
    document.querySelectorAll('.reject-invite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const inviteItem = e.target.closest('.invite-item');
            const inviteId = inviteItem ? inviteItem.dataset.id : null;
            
            if (inviteId) {
                removeInvite(inviteId);
                
                // Remove invite item from UI
                if (inviteItem && inviteItem.parentNode) {
                    inviteItem.parentNode.removeChild(inviteItem);
                }
                
                // Check if there are no more invites
                const invitesContainer = document.getElementById('invites-container');
                if (invitesContainer && invitesContainer.children.length === 0) {
                    invitesContainer.innerHTML = '<div class="empty-state">No invites</div>';
                }
                
                // Show notification
                showNotification('Invite Declined', 'The invitation has been declined');
            }
        });
    });
}

// Function to remove an invite from storage
function removeInvite(inviteId) {
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
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    const titleEl = document.querySelector('.notification-title');
    const messageEl = document.querySelector('.notification-message');
    
    if (notification && titleEl && messageEl) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        notification.classList.add('show');
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
} 