/**
 * Authentication check script
 * Run this on every page that requires authentication
 */
(function() {
    console.log('Running checkAuth.js');
    
    // Make sure Auth namespace is accessible
    if (!window.Auth) {
        console.warn('Auth namespace not found. Authentication checks may fail.');
    }
    
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
        const token = localStorage.getItem('token');
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

        // If no token or user info, redirect to login
        if (!token || !userInfo._id) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = 'pages/login.html';
            return false;
        }

        // In demo mode, always return true
        if (token === 'demo-token') {
            console.log('DEVELOPMENT MODE: User is authenticated');
            return true;
        }

        // For production, you'd validate the token here
        return true;
    }
    
    // Run immediately
    checkAuth();
})(); 