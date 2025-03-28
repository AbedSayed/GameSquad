/**
 * Special script to handle the root URL access
 * This ensures that when users visit http://localhost:8080 without proper authentication
 * they get redirected to the landing page
 */
(function() {
    console.log('Running root-check.js for http://localhost:8080');
    
    // Check if we're at the exact root URL
    const isRootUrl = window.location.href === 'http://localhost:8080/' ||
                      window.location.href === 'http://localhost:8080';
    
    if (!isRootUrl) {
        console.log('Not at root URL, skipping root check');
        return;
    }
    
    console.log('At root URL, checking authentication status');
    
    // Check authentication
    let hasValidUserInfo = false;
    let hasToken = false;
    
    try {
        const userInfoStr = localStorage.getItem('userInfo');
        const token = localStorage.getItem('token');
        
        hasToken = token !== null && token !== undefined && token.trim() !== '';
        
        if (userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            // Check if userInfo has valid username
            hasValidUserInfo = userInfo && 
                              userInfo.username && 
                              userInfo.username !== 'Username' &&
                              userInfo.username.trim() !== '';
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
        hasValidUserInfo = false;
        // Clear corrupted data
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
    }
    
    const isAuthenticated = hasValidUserInfo && hasToken;
    console.log('Root URL auth check:', { hasValidUserInfo, hasToken, isAuthenticated });
    
    // If not authenticated, redirect to landing page
    if (!isAuthenticated) {
        console.log('Not authenticated at root URL, redirecting to landing.html');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        window.location.replace('/landing.html');
    }
})(); 