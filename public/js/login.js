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

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const notificationsContainer = document.querySelector('.notifications-container');
    
    // Create notifications container if it doesn't exist
    if (!notificationsContainer) {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Clear previous error messages
            const errorElements = document.querySelectorAll('.error-message');
            errorElements.forEach(el => el.remove());
            
            // Basic form validation
            if (!email) {
                showFormError('email', 'Email is required');
                return;
            }
            
            if (!password) {
                showFormError('password', 'Password is required');
                return;
            }

            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            try {
                const user = await window.Auth.loginUser(email, password);
                console.log('Login successful:', user);
                
                // Store user data
                storeUserData(user);
                
                // Show success message
                showNotification('Login successful! Redirecting...', 'success');

                // Redirect to home page after login (with slight delay for notification)
                setTimeout(() => {
                    window.location.href = '../home.html';
                }, 1000);
            } catch (error) {
                console.error('Login failed:', error);
                
                // Display the error message
                showNotification(error.message || 'Login failed. Please try again.', 'error');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
});

// Function to show form-specific errors
function showFormError(fieldId, message) {
    const field = document.getElementById(fieldId);
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.875rem';
    errorDiv.style.marginTop = '0.25rem';
    
    // Insert after the field
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
    
    // Highlight the field
    field.style.borderColor = '#dc3545';
    
    // Focus the field
    field.focus();
} 