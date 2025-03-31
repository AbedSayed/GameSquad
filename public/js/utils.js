
/**
 * Show a notification to the user
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} type - The notification type (info, success, error, warning)
 */
function showNotification(title, message, type = 'info') {
    console.log(`[utils.js] Showing notification: ${title} - ${message}`);
    
    if (!window.recentNotifications) {
        window.recentNotifications = new Set();
    }
    
    if (!window.notificationsMap) {
        window.notificationsMap = new Map();
    }
    
    const notificationKey = `${title}:${message}:${type}`;
    
    if (window.recentNotifications.has(notificationKey)) {
        console.log(`🚫 DUPLICATE NOTIFICATION BLOCKED: "${title} - ${message}"`);
        
        const count = window.notificationsMap.get(notificationKey) || 0;
        window.notificationsMap.set(notificationKey, count + 1);
        console.log(`🔢 Duplicate count for "${title}": ${count + 1}`);
        
        return;
    }
    
    window.recentNotifications.add(notificationKey);
    window.notificationsMap.set(notificationKey, 1);
    
    setTimeout(() => {
        window.recentNotifications.delete(notificationKey);
        console.log(`🧹 Cleared deduplication for: "${title} - ${message}"`);
    }, 5000);
    
    const notificationsContainer = document.querySelector('.notifications-container');
    if (!notificationsContainer) {
        console.error('Notifications container not found');
        ensureNotificationsContainer();
        return showNotification(title, message, type); // Try again after creating container
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-title">${title}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    notificationsContainer.appendChild(notification);
    
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        });
    }
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 5000);
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

/**
 * Custom confirmation dialog function that replaces the browser's default confirm
 * @param {Object} options - Configuration options
 * @param {string} options.title - The dialog title
 * @param {string} options.message - The message to display
 * @param {string} options.highlight - Optional text to highlight within the message
 * @param {string} options.confirmText - Text for the confirm button (default: "Confirm")
 * @param {string} options.cancelText - Text for the cancel button (default: "Cancel")
 * @param {string} options.icon - FontAwesome icon class (default: "fa-exclamation-triangle")
 * @returns {Promise} A promise that resolves to true if confirmed, false if canceled
 */
function customConfirm(options) {
    const settings = {
        title: 'Confirmation',
        message: 'Are you sure you want to proceed?',
        highlight: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        icon: 'fa-exclamation-triangle',
        ...options
    };

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-confirm-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'custom-confirm-modal';
        
        let formattedMessage = settings.message;
        if (settings.highlight) {
            formattedMessage = settings.message.replace(settings.highlight, `<span class="highlight">${settings.highlight}</span>`);
        }
        
        modal.innerHTML = `
            <div class="custom-confirm-header">
                <i class="fas ${settings.icon}"></i>
                <h3>${settings.title}</h3>
            </div>
            <div class="custom-confirm-content">
                ${formattedMessage}
            </div>
            <div class="custom-confirm-buttons">
                <button class="cancel-button">
                    <i class="fas fa-times"></i> ${settings.cancelText}
                </button>
                <button class="confirm-button">
                    <i class="fas fa-check"></i> ${settings.confirmText}
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        
        document.body.appendChild(overlay);
        
        document.body.style.overflow = 'hidden';
        
        const closeModal = (result) => {
            overlay.classList.add('closing');
            modal.classList.add('closing');
            
            setTimeout(() => {
                document.body.removeChild(overlay);
                document.body.style.overflow = '';
                resolve(result);
            }, 300);
        };
        
        const confirmBtn = modal.querySelector('.confirm-button');
        const cancelBtn = modal.querySelector('.cancel-button');
        
        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                closeModal(false);
            }
        });
        
        setTimeout(() => cancelBtn.focus(), 100);
    });
}

function ensureNotificationsContainer() {
    if (!document.querySelector('.notifications-container')) {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
        console.log('[utils.js] Created notifications container');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    ensureNotificationsContainer();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        formatDate,
        getInitials,
        generateId,
        getUserInfo,
        isLoggedIn,
        requireLogin,
        redirectIfLoggedIn,
        customConfirm,
        ensureNotificationsContainer
    };
}

window.customConfirm = customConfirm;
window.ensureNotificationsContainer = ensureNotificationsContainer; 