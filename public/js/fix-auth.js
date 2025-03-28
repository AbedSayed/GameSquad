// Script to force clear authentication data
(function() {
    console.log('Running fix-auth.js');
    
    // Always clear localStorage auth data
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    console.log('Cleared authentication data from localStorage');
    
    // Force redirect to landing page if not already there
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/' || currentPath === '/landing.html';
    
    if (!isLandingPage) {
        console.log('Redirecting to landing page');
        window.location.href = '/landing.html';
    } else {
        console.log('Already on landing page');
    }
})(); 