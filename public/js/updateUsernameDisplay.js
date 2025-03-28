/**
 * Force update all username displays on the page
 * This script can be added to any page to ensure the username is properly shown
 */
(function() {
    console.log('Running updateUsernameDisplay.js');
    
    function updateAllUsernames() {
        try {
            // Get user info from localStorage
            const userInfoString = localStorage.getItem('userInfo');
            if (!userInfoString) {
                console.log('No user info found in localStorage');
                return;
            }
            
            // Parse user info JSON
            const userInfo = JSON.parse(userInfoString);
            console.log('User info loaded:', userInfo);
            
            // Find all username elements
            const usernameElements = document.querySelectorAll('.username');
            if (usernameElements.length === 0) {
                console.log('No username elements found on page');
                return;
            }
            
            // Update all instances of username in the UI
            usernameElements.forEach(element => {
                // Get username from userInfo directly with fallbacks
                let displayName = 'User'; // Default fallback
                
                if (userInfo.username) {
                    displayName = userInfo.username;
                } else if (userInfo.user && userInfo.user.username) {
                    displayName = userInfo.user.username;
                }
                
                // Update the element with the username
                element.textContent = displayName;
                console.log('Updated username display with:', displayName);
            });
            
            // Check for dropdown elements that might need updating
            const userDropdown = document.querySelector('.user-profile');
            if (userDropdown) {
                userDropdown.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Error updating username display:', error);
        }
    }
    
    // Update immediately when script loads
    updateAllUsernames();
    
    // Also set up to update when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', updateAllUsernames);
})(); 