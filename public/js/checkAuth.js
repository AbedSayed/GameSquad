/**
 * Authentication check script
 * Run this on every page that requires authentication
 */
(function() {
    console.log('Running checkAuth.js');
    
    if (!window.Auth) {
        console.warn('Auth namespace not found. Authentication checks may fail.');
    }
    
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/' || 
                          currentPath === '/landing.html' || 
                          currentPath.includes('/login.html') || 
                          currentPath.includes('/register.html');
    
    if (isLandingPage) {
        console.log('On landing or auth page, skipping auth check');
        return;
    }
    
    function checkAuth() {
        const token = localStorage.getItem('token');
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

        if (!token || !userInfo._id) {
            console.log('User not authenticated, redirecting to login');
            if (window.location.pathname.includes('/pages/')) {
                window.location.href = 'login.html';
            } else {
                window.location.href = 'pages/login.html';
            }
            return false;
        }

        if (token === 'demo-token') {
            console.log('DEVELOPMENT MODE: User is authenticated');
            return true;
        }

        return true;
    }
    
    checkAuth();
})(); 