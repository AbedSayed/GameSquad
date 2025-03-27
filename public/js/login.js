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
    localStorage.setItem('userToken', userData.token);
    localStorage.setItem('userInfo', JSON.stringify({
        id: userData._id,
        username: userData.username,
        email: userData.email
    }));
}

// Handle form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${APP_CONFIG.API_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Login failed');
        }
        
        // Store user data
        storeUserData(data);
        
        // Show success notification
        showNotification('Login successful! Redirecting...', 'success');
        
        // Get the return URL if it exists
        const returnUrl = localStorage.getItem('returnUrl');
        
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
        showNotification(error.message);
        // Also update the login error message in the form
        const loginError = document.getElementById('login-error');
        if (loginError) {
            loginError.textContent = error.message;
        }
    }
}); 