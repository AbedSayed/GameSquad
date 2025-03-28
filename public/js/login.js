// Function to show notifications
function showNotification(message, type = 'error') {
    const container = document.querySelector('.notifications-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Function to store user data
function storeUserData(userData) {
    console.log('Storing user data:', userData);
    
    // Store token separately
    localStorage.setItem('token', userData.token);
    
    // Store complete user info exactly as it comes from the server
    localStorage.setItem('userInfo', JSON.stringify(userData));
    
    // Log the stored data
    console.log('Token stored:', localStorage.getItem('token'));
    console.log('User info stored:', localStorage.getItem('userInfo'));
}

// Handle form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('Attempting login with email:', email);
    
    try {
        const response = await fetch(`${window.APP_CONFIG.API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        console.log('Login response status:', response.status);
        
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Login failed');
        }
        
        // Store user data
        storeUserData(data);
        
        // Show success notification
        showNotification('Login successful! Redirecting...', 'success');
        
        // Get the return URL if it exists
        const returnUrl = localStorage.getItem('returnUrl');
        
        console.log('Will redirect to:', returnUrl || '../index.html');
        
        // Redirect after a short delay
        setTimeout(() => {
            if (returnUrl) {
                localStorage.removeItem('returnUrl'); // Clean up
                window.location.href = returnUrl;
            } else {
                window.location.href = '../index.html';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message);
        // Also update the login error message in the form
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = error.message;
        }
    }
}); 