/**
 * Authentication check script
 * Run this on every page that requires authentication
 */
(function() {
    console.log('Running checkAuth.js');
    
    // Check if we're on landing.html or login/register pages
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/' || 
                          currentPath === '/landing.html' || 
                          currentPath.includes('/login.html') || 
                          currentPath.includes('/register.html');
    
    // Skip auth check on landing/auth pages
    if (isLandingPage) {
        console.log('On landing or auth page, skipping auth check');
        return;
    }
    
    // Check authentication
    function checkAuth() {
        console.log('Checking authentication');
        let hasValidUserInfo = false;
        let hasToken = false;
        
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const token = localStorage.getItem('token');
            
            hasToken = token !== null && token !== undefined;
            
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                // Check if userInfo has valid username
                hasValidUserInfo = userInfo && 
                                   userInfo.username && 
                                   userInfo.username !== 'Username' && 
                                   userInfo.username.trim() !== '';
            }
        } catch (e) {
            console.error('Error checking auth:', e);
            hasValidUserInfo = false;
        }
        
        console.log('Auth status:', { hasValidUserInfo, hasToken });
        
        // Redirect to landing page if not authenticated
        if (!hasValidUserInfo || !hasToken) {
            console.log('Not authenticated, redirecting to landing page');
            
            // Clear any existing data
            localStorage.removeItem('userInfo');
            localStorage.removeItem('token');
            
            // Determine the correct path to landing.html
            let landingPath;
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                landingPath = '/landing.html';
            } else if (currentPath.includes('/pages/')) {
                landingPath = '../landing.html';
            } else {
                landingPath = '/landing.html';
            }
            
            console.log('Redirecting to:', landingPath);
            
            // Redirect
            window.location.href = landingPath;
        }
    }
    
    // Run immediately
    checkAuth();
})(); 