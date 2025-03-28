/**
 * Reset UI - Forces UI to match the correct authentication state
 * Run this script to immediately fix any inconsistencies in the UI
 */
(function() {
    console.log('Running reset-ui.js');
    
    // Check if we're on an auth page (login/register)
    const isAuthPage = document.body.classList.contains('auth-page') || 
                       window.location.pathname.includes('/login.html') || 
                       window.location.pathname.includes('/register.html');
    
    // If we're on an auth page, force logout UI state
    if (isAuthPage) {
        console.log('Auth page detected, forcing logout UI state');
        // Clear localStorage
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        
        // Update UI immediately
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.classList.add('hidden');
            userProfile.style.display = 'none';
        }
        
        const authButtons = document.querySelector('.auth-buttons');
        if (authButtons) {
            authButtons.classList.remove('hidden');
            authButtons.style.display = '';
        }
        
        return; // Skip the rest of the function since we're on an auth page
    }
    
    // For non-auth pages, check if user is actually authenticated
    let isAuthenticated = false;
    try {
        const userInfoStr = localStorage.getItem('userInfo');
        const token = localStorage.getItem('token');
        
        if (userInfoStr && token) {
            // Parse userInfo to check for valid data
            const userInfo = JSON.parse(userInfoStr);
            // Must have username that's not the default
            isAuthenticated = userInfo && 
                              userInfo.username && 
                              userInfo.username !== 'Username' &&
                              userInfo.username.trim() !== '';
            
            // If we have invalid data, clean it up
            if (!isAuthenticated) {
                console.log('Invalid user data detected in localStorage, cleaning up');
                localStorage.removeItem('userInfo');
                localStorage.removeItem('token');
            }
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
        isAuthenticated = false;
        // Clear corrupted data
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
    }
    
    // Update UI elements based on authentication state
    // This ensures the UI matches the actual auth state
    document.addEventListener('DOMContentLoaded', function() {
        // Get UI elements
        const userProfile = document.querySelector('.user-profile');
        const authButtons = document.querySelector('.auth-buttons');
        const authOnlyElements = document.querySelectorAll('.auth-only');
        const nonAuthOnlyElements = document.querySelectorAll('.non-auth-only');
        
        if (isAuthenticated) {
            // User is authenticated - show user profile, hide auth buttons
            if (userProfile) {
                userProfile.classList.remove('hidden');
                
                // Update username if possible
                try {
                    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                    const usernameElement = userProfile.querySelector('.username');
                    if (usernameElement && userInfo && userInfo.username) {
                        usernameElement.textContent = userInfo.username;
                    }
                } catch (e) {
                    console.error('Error updating username display:', e);
                }
            }
            
            if (authButtons) {
                authButtons.classList.add('hidden');
            }
            
            // Show auth-only content
            authOnlyElements.forEach(el => {
                el.classList.add('visible');
                el.classList.remove('hidden');
            });
            
            // Hide non-auth-only content
            nonAuthOnlyElements.forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('visible');
            });
        } else {
            // User is not authenticated - hide user profile, show auth buttons
            if (userProfile) {
                userProfile.classList.add('hidden');
            }
            
            if (authButtons) {
                authButtons.classList.remove('hidden');
            }
            
            // Hide auth-only content
            authOnlyElements.forEach(el => {
                el.classList.remove('visible');
                el.classList.add('hidden');
            });
            
            // Show non-auth-only content
            nonAuthOnlyElements.forEach(el => {
                el.classList.remove('hidden');
                el.classList.add('visible');
            });
        }
    });
})(); 