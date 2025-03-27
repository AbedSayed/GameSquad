// Form validation function
function validateForm(username, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
    }
    
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    
    if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
    }
    
    if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
    }
}

// Handle form submission
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const termsAccepted = document.getElementById('terms').checked;
    
    try {
        // Validate form
        if (!termsAccepted) {
            throw new Error('Please accept the Terms of Service and Privacy Policy');
        }
        
        validateForm(username, email, password, confirmPassword);
        
        // Send registration request
        const response = await fetch(`${APP_CONFIG.API_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        // Registration successful
        alert('Registration successful! Please login.');
        window.location.href = 'login.html';
        
    } catch (error) {
        alert(error.message);
    }
}); 