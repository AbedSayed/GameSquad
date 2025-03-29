// Utility functions for GameSquad

/**
 * Show a notification to the user
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type (info, success, error, warning)
 */
function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    
    if (!notification) {
        // Create notification element if it doesn't exist
        const newNotification = document.createElement('div');
        newNotification.id = 'notification';
        newNotification.className = `notification ${type}`;
        newNotification.innerHTML = `
            <div class="notification-content">
                <span class="notification-title">${title}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(newNotification);
        
        // Add close event listener
        const closeBtn = newNotification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                newNotification.classList.remove('show');
            });
        }
        
        // Show the notification
        setTimeout(() => {
            newNotification.classList.add('show');
        }, 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            newNotification.classList.remove('show');
        }, 3000);
    } else {
        // Update existing notification
        const titleEl = notification.querySelector('.notification-title');
        const messageEl = notification.querySelector('.notification-message');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        // Remove existing type classes and add the new one
        notification.className = `notification ${type}`;
        
        // Show the notification
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

/**
 * Format a date for display
 * @param {string|Date} date - The date to format
 * @param {boolean} includeTime - Whether to include the time
 * @returns {string} Formatted date string
 */
function formatDate(date, includeTime = false) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return d.toLocaleDateString(undefined, options);
}

/**
 * Get initials from a name
 * @param {string} name - The name to get initials from
 * @param {number} length - Number of characters to return
 * @returns {string} Initials
 */
function getInitials(name, length = 2) {
    if (!name) return '';
    
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, length);
}

/**
 * Generate a random ID
 * @param {number} length - Length of ID to generate
 * @returns {string} Random ID
 */
function generateId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Get user info from localStorage
 * @returns {Object|null} User info or null if not found
 */
function getUserInfo() {
    try {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
            return JSON.parse(userInfoStr);
        }
    } catch (err) {
        console.error('Error parsing user info:', err);
    }
    return null;
}

/**
 * Check if user is logged in
 * @returns {boolean} True if logged in, false otherwise
 */
function isLoggedIn() {
    const userInfo = getUserInfo();
    return !!userInfo && !!userInfo._id;
}

/**
 * Redirect to login page if not logged in
 */
function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = '../index.html';
    }
}

/**
 * Redirect to home page if already logged in
 */
function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        window.location.href = 'home.html';
    }
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        formatDate,
        getInitials,
        generateId,
        getUserInfo,
        isLoggedIn,
        requireLogin,
        redirectIfLoggedIn
    };
} 