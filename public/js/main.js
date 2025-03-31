// Main JavaScript file for GameSquad website

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking a nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
    
    // Authentication state management - ensure this runs on every page load
    checkAuthState();
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout button clicked from main.js');
            logout();
            return false;
        });
    }
    
    // Call existing initialization logic
    initApp();
    
    // Call username update explicitly to ensure it runs after DOM is loaded
    updateUsernameDisplay();
});

/**
 * Check if user is authenticated and update UI accordingly
 */
function checkAuthState() {
    // Don't redirect if on login/register/landing pages
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/' || currentPath === '/landing.html';
    const isAuthPage = currentPath.includes('/login.html') || currentPath.includes('/register.html');
    
    if (isLandingPage || isAuthPage) {
        console.log('On landing or auth page, skipping redirection check');
        return;
    }

    // Check if user is authenticated
    let isAuthenticated = false;
    
    // Use the auth.js isLoggedIn function if available
    if (typeof window.Auth !== 'undefined' && typeof window.Auth.isLoggedIn === 'function') {
        isAuthenticated = window.Auth.isLoggedIn();
    } else {
        // Fallback to basic check
        try {
            const userInfoStr = localStorage.getItem('userInfo');
            const token = localStorage.getItem('token');
            
            isAuthenticated = !!(userInfoStr && token);
        } catch (error) {
            console.error('Error checking auth state:', error);
            isAuthenticated = false;
        }
    }
    
    console.log('Auth state:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    // Update UI elements based on authentication state
    updateUIForAuthState(isAuthenticated);
    
    // Only redirect to landing page if explicitly not authenticated
    // and we're on a page that requires authentication
    if (!isAuthenticated && !isLandingPage && !isAuthPage) {
        console.log('Not authenticated, redirecting to landing page');
        window.location.href = '/landing.html';
    }
}

/**
 * Update UI elements based on authentication state
 * @param {boolean} isAuthenticated - Whether user is authenticated
 */
function updateUIForAuthState(isAuthenticated) {
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');
    
    if (isAuthenticated) {
        // User is logged in
        if (authButtons) authButtons.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        
        // Show authenticated content
        document.querySelectorAll('.auth-only').forEach(el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
        
        // Hide non-authenticated content
        document.querySelectorAll('.non-auth-only').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
    } else {
        // User is not logged in
        if (authButtons) authButtons.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
        
        // Hide authenticated content
        document.querySelectorAll('.auth-only').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
        
        // Show non-authenticated content
        document.querySelectorAll('.non-auth-only').forEach(el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }
}

/**
 * Validate the stored auth token with the server
 * If token is invalid, logout the user
 */
async function validateTokenWithServer() {
    try {
        // Check if we should skip validation
        const currentPath = window.location.pathname;
        const isLandingPage = currentPath === '/' || currentPath === '/landing.html';
        const isAuthPage = currentPath.includes('/login.html') || currentPath.includes('/register.html');
        
        if (isLandingPage || isAuthPage) {
            console.log('On landing or auth page, skipping token validation');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, skipping validation');
            return;
        }

        // Make a request to the server to validate the token
        console.log('Validating token with server...');
        const response = await fetch(`${window.APP_CONFIG.API_URL}/users/validate-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // If response is not ok, token is invalid
        if (!response.ok) {
            console.log('Invalid token detected from server response, logging out');
            logout();
        } else {
            console.log('Token validated successfully');
        }
    } catch (error) {
        console.error('Error validating token:', error);
        // Don't automatically logout on network errors
        // This prevents logout loops when server is unreachable
    }
}

/**
 * Logout user
 */
function logout() {
    console.log('Global logout function called');
    
    // Clear user data from localStorage immediately
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    
    // Force redirect to home page with the correct path
    console.log('Redirecting to index page from main.js');
    const path = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
    
    // Use replace instead of href for cleaner redirect without history
    window.location.replace(path);
}

// Expose logout function globally
window.logout = logout;

/**
 * Update username display in the header
 */
function updateUsernameDisplay() {
    try {
        // Check if we're viewing another user's profile
        if (window.VIEWING_OTHER_PROFILE === true) {
            console.log('main.js: Skipping username update since we are viewing another profile');
            return; // Skip updating if we're viewing someone else's profile
        }

        // Get user info from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (!userInfo) {
            console.log('No user info found in localStorage');
            return;
        }

        console.log('User info loaded for display:', userInfo);
        
        // Update all username elements
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            element.textContent = userInfo.username || 'User';
            console.log('Updated username element with:', userInfo.username || 'User');
        });
        
        // Make sure the user profile container is visible
        const userProfileContainer = document.querySelector('.user-profile');
        if (userProfileContainer) {
            userProfileContainer.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error updating username display:', error);
    }
}

// Also update username periodically in case it changes
setInterval(updateUsernameDisplay, 5000);

/**
 * Initialize application
 */
function initApp() {
    // Form validation utility
    function validateForm(form) {
        let isValid = true;
        
        // Get all required inputs
        const requiredInputs = form.querySelectorAll('[required]');
        
        // Check each required input
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                showInputError(input, 'This field is required');
            } else {
                clearInputError(input);
                
                // Additional validation based on input type
                if (input.type === 'email' && !validateEmail(input.value)) {
                    isValid = false;
                    showInputError(input, 'Please enter a valid email address');
                }
                
                if (input.id === 'password' && input.value.length < 8) {
                    isValid = false;
                    showInputError(input, 'Password must be at least 8 characters');
                }
                
                if (input.id === 'confirm-password') {
                    const password = form.querySelector('#password');
                    if (password && input.value !== password.value) {
                        isValid = false;
                        showInputError(input, 'Passwords do not match');
                    }
                }
            }
        });
        
        return isValid;
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - Whether the email is valid
     */
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Show error message for input
     * @param {HTMLElement} input - The input element
     * @param {string} message - Error message to display
     */
    function showInputError(input, message) {
        const formControl = input.parentElement;
        const errorElement = formControl.querySelector('.error-message');
        
        if (errorElement) {
            errorElement.textContent = message;
        } else {
            const error = document.createElement('div');
            error.className = 'error-message';
            error.textContent = message;
            formControl.appendChild(error);
        }
        
        input.classList.add('error');
    }

    /**
     * Clear error message for input
     * @param {HTMLElement} input - The input element
     */
    function clearInputError(input) {
        const formControl = input.parentElement;
        const errorElement = formControl.querySelector('.error-message');
        
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        input.classList.remove('error');
    }

    /**
     * Create a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Notification type (success, error, info)
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to DOM
        const notificationsContainer = document.querySelector('.notifications-container');
        if (notificationsContainer) {
            notificationsContainer.appendChild(notification);
        } else {
            const container = document.createElement('div');
            container.className = 'notifications-container';
            container.appendChild(notification);
            document.body.appendChild(container);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @returns {string} - Formatted date string
     */
    function formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }

    /**
     * Fetch API wrapper with error handling
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async function fetchAPI(url, options = {}) {
        try {
            // Add default headers
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            };
            
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    }

    // Module pattern for specific features
    const UserModule = (function() {
        // Private variables and functions
        if (!window.APP_CONFIG?.API_URL) {
            console.error('APP_CONFIG.API_URL is not defined. Make sure config.js is loaded first.');
            return {};
        }
        
        // Public API
        return {
            login: async function(email, password) {
                try {
                    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Invalid email or password');
                    }

                    // Store user data and token
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    localStorage.setItem('token', data.token);

                    return data;
                } catch (error) {
                    console.error('Login error:', error);
                    throw error;
                }
            },
            
            register: async function(username, email, password) {
                try {
                    // Make a real API call to the server
                    const response = await fetch(`${window.APP_CONFIG.API_URL}/users/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            username,
                            email,
                            password
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || 'Registration failed');
                    }

                    // Store user data and token
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    localStorage.setItem('token', data.token);

                    return data;
                } catch (error) {
                    console.error('Registration error:', error);
                    throw error;
                }
            },
            
            updateProfile: async function(profileData) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Get current user data
                    const userData = JSON.parse(localStorage.getItem('userInfo'));
                    
                    // Update user data
                    const updatedUserData = {
                        ...userData,
                        ...profileData
                    };
                    
                    // Store updated user data
                    localStorage.setItem('userInfo', JSON.stringify(updatedUserData));
                    
                    return updatedUserData;
                } catch (error) {
                    console.error('Profile update error:', error);
                    throw error;
                }
            }
        };
    })();

    const LobbyModule = (function() {
        // Private variables and functions
        let lobbies = [];
        
        // Public API
        return {
            getLobbies: async function() {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Simulate API call
                    lobbies = [
                        {
                            id: 'lobby1',
                            name: 'CS:GO Competitive',
                            game: 'CS:GO',
                            creator: 'user123',
                            creatorName: 'gamer42',
                            members: ['user123'],
                            maxSize: 5,
                            status: 'open',
                            rank: 'Gold Nova',
                            language: 'English',
                            createdAt: new Date()
                        },
                        {
                            id: 'lobby2',
                            name: 'Valorant Team',
                            game: 'Valorant',
                            creator: 'user456',
                            creatorName: 'valorantPro',
                            members: ['user456', 'user789'],
                            maxSize: 5,
                            status: 'open',
                            rank: 'Platinum',
                            language: 'Spanish',
                            createdAt: new Date()
                        }
                    ];
                    
                    return lobbies;
                } catch (error) {
                    console.error('Get lobbies error:', error);
                    throw error;
                }
            },
            
            createLobby: async function(lobbyData) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Get current user data
                    const userData = JSON.parse(localStorage.getItem('userInfo'));
                    
                    // Create new lobby
                    const newLobby = {
                        id: 'lobby' + Date.now(),
                        creator: userData.id,
                        creatorName: userData.username,
                        members: [userData.id],
                        maxSize: 5,
                        status: 'open',
                        createdAt: new Date(),
                        ...lobbyData
                    };
                    
                    // Add to lobbies array
                    lobbies.push(newLobby);
                    
                    return newLobby;
                } catch (error) {
                    console.error('Create lobby error:', error);
                    throw error;
                }
            },
            
            joinLobby: async function(lobbyId) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Get current user data
                    const userData = JSON.parse(localStorage.getItem('userInfo'));
                    
                    // Find lobby
                    const lobby = lobbies.find(l => l.id === lobbyId);
                    
                    if (!lobby) {
                        throw new Error('Lobby not found');
                    }
                    
                    if (lobby.members.length >= lobby.maxSize) {
                        throw new Error('Lobby is full');
                    }
                    
                    if (lobby.members.includes(userData.id)) {
                        throw new Error('You are already in this lobby');
                    }
                    
                    // Add user to lobby
                    lobby.members.push(userData.id);
                    
                    // Update lobby status if full
                    if (lobby.members.length >= lobby.maxSize) {
                        lobby.status = 'full';
                    }
                    
                    return lobby;
                } catch (error) {
                    console.error('Join lobby error:', error);
                    throw error;
                }
            }
        };
    })();

    const ChatModule = (function() {
        // Private variables and functions
        let socket = null;
        
        function initializeSocket() {
            // This is a placeholder - will be replaced with actual WebSocket connection
            console.log('WebSocket would be initialized here');
            // socket = new WebSocket('ws://your-websocket-server');
        }
        
        // Public API
        return {
            connect: function() {
                if (!socket) {
                    initializeSocket();
                }
            },
            
            sendMessage: async function(recipient, content) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Get current user data
                    const userData = JSON.parse(localStorage.getItem('userInfo'));
                    
                    // Create message object
                    const message = {
                        id: 'msg' + Date.now(),
                        sender: userData.id,
                        senderName: userData.username,
                        recipient: recipient,
                        content: content,
                        timestamp: new Date(),
                        isRead: false
                    };
                    
                    // In a real implementation, this would send the message through WebSocket
                    console.log('Message sent:', message);
                    
                    return message;
                } catch (error) {
                    console.error('Send message error:', error);
                    throw error;
                }
            },
            
            getMessages: async function(conversationId) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Simulate API call
                    const messages = [
                        {
                            id: 'msg1',
                            sender: 'user456',
                            senderName: 'valorantPro',
                            recipient: 'user123',
                            content: 'Hey, want to join my Valorant team?',
                            timestamp: new Date(Date.now() - 3600000),
                            isRead: true
                        },
                        {
                            id: 'msg2',
                            sender: 'user123',
                            senderName: 'gamer42',
                            recipient: 'user456',
                            content: 'Sure, what rank are you looking for?',
                            timestamp: new Date(Date.now() - 3500000),
                            isRead: true
                        }
                    ];
                    
                    return messages;
                } catch (error) {
                    console.error('Get messages error:', error);
                    throw error;
                }
            }
        };
    })();

    const SearchModule = (function() {
        // Public API
        return {
            searchUsers: async function(filters) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Simulate API call
                    const users = [
                        {
                            id: 'user456',
                            username: 'valorantPro',
                            profilePic: 'assets/default-avatar.png',
                            onlineStatus: 'online',
                            gameRanks: [
                                { game: 'Valorant', rank: 'Platinum' }
                            ],
                            languages: ['Spanish', 'English'],
                            interests: ['Competitive', 'Strategy']
                        },
                        {
                            id: 'user789',
                            username: 'csgoMaster',
                            profilePic: 'assets/default-avatar.png',
                            onlineStatus: 'offline',
                            gameRanks: [
                                { game: 'CS:GO', rank: 'Global Elite' }
                            ],
                            languages: ['English', 'German'],
                            interests: ['Competitive', 'Teamwork']
                        }
                    ];
                    
                    // Apply filters if provided
                    let filteredUsers = users;
                    
                    if (filters) {
                        if (filters.rank) {
                            filteredUsers = filteredUsers.filter(user => 
                                user.gameRanks.some(gr => gr.rank.toLowerCase().includes(filters.rank.toLowerCase()))
                            );
                        }
                        
                        if (filters.language) {
                            filteredUsers = filteredUsers.filter(user => 
                                user.languages.some(lang => lang.toLowerCase().includes(filters.language.toLowerCase()))
                            );
                        }
                        
                        if (filters.interest) {
                            filteredUsers = filteredUsers.filter(user => 
                                user.interests.some(interest => interest.toLowerCase().includes(filters.interest.toLowerCase()))
                            );
                        }
                        
                        if (filters.onlineStatus) {
                            filteredUsers = filteredUsers.filter(user => 
                                user.onlineStatus === filters.onlineStatus
                            );
                        }
                    }
                    
                    return filteredUsers;
                } catch (error) {
                    console.error('Search users error:', error);
                    throw error;
                }
            },
            
            searchLobbies: async function(filters) {
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Use LobbyModule to get lobbies
                    const lobbies = await LobbyModule.getLobbies();
                    
                    // Apply filters if provided
                    let filteredLobbies = lobbies;
                    
                    if (filters) {
                        if (filters.game) {
                            filteredLobbies = filteredLobbies.filter(lobby => 
                                lobby.game.toLowerCase().includes(filters.game.toLowerCase())
                            );
                        }
                        
                        if (filters.rank) {
                            filteredLobbies = filteredLobbies.filter(lobby => 
                                lobby.rank.toLowerCase().includes(filters.rank.toLowerCase())
                            );
                        }
                        
                        if (filters.language) {
                            filteredLobbies = filteredLobbies.filter(lobby => 
                                lobby.language.toLowerCase().includes(filters.language.toLowerCase())
                            );
                        }
                        
                        if (filters.status) {
                            filteredLobbies = filteredLobbies.filter(lobby => 
                                lobby.status === filters.status
                            );
                        }
                    }
                    
                    return filteredLobbies;
                } catch (error) {
                    console.error('Search lobbies error:', error);
                    throw error;
                }
            }
        };
    })();
}
