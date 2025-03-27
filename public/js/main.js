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
            logout();
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
    // Check if user is authenticated using the correct localStorage key
    const isAuthenticated = localStorage.getItem('userInfo') !== null;
    
    // Get current page path
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/' || currentPath === '/landing.html';
    const isAuthPage = currentPath.includes('/login.html') || currentPath.includes('/register.html');
    
    // Handle redirects based on auth state
    if (!isAuthenticated && !isLandingPage && !isAuthPage) {
        // If not authenticated and not on landing or auth pages, redirect to landing
        window.location.href = '/landing.html';
        return;
    }
    
    // Update UI elements if they exist
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');
    
    if (isAuthenticated) {
        // User is logged in
        if (authButtons) authButtons.classList.add('hidden');
        if (userProfile) {
            userProfile.classList.remove('hidden');
            
            // Update profile info
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const usernameElement = userProfile.querySelector('.username');
            if (usernameElement && userInfo.username) {
                usernameElement.textContent = userInfo.username;
            }
        }
        
        // Show authenticated content
        document.querySelectorAll('.auth-only').forEach(el => {
            el.classList.add('visible');
        });
        
        // Hide non-authenticated content
        document.querySelectorAll('.non-auth-only').forEach(el => {
            el.classList.add('hidden');
        });
    } else {
        // User is not logged in
        if (authButtons) authButtons.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
        
        // Hide authenticated content
        document.querySelectorAll('.auth-only').forEach(el => {
            el.classList.remove('visible');
        });
        
        // Show non-authenticated content
        document.querySelectorAll('.non-auth-only').forEach(el => {
            el.classList.remove('hidden');
        });
    }
}

/**
 * Logout user
 */
function logout() {
    // Clear user data from localStorage
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    
    // Update UI
    checkAuthState();
    
    // Get the correct path to index.html based on current location
    const path = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
    
    // Redirect to home page
    window.location.href = path;
}

/**
 * Update username display in the header
 */
function updateUsernameDisplay() {
    try {
        // Get user info from localStorage
        const userInfoString = localStorage.getItem('userInfo');
        if (!userInfoString) {
            console.log('No user info found in localStorage');
            return;
        }
        
        const userInfo = JSON.parse(userInfoString);
        console.log('User info loaded:', userInfo);
        
        // Find all username elements and update them
        const usernameElements = document.querySelectorAll('.username');
        if (usernameElements.length === 0) {
            console.log('No username elements found');
            return;
        }
        
        // Update all username elements to ensure consistency across different parts of the UI
        usernameElements.forEach(element => {
            // Using the username from userInfo, or the username's name if available, or 'User' as fallback
            const displayName = userInfo.username || (userInfo.user && userInfo.user.username) || 'User';
            element.textContent = displayName;
            console.log('Updated username element with:', displayName);
        });
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
                // This is a placeholder - will be replaced with actual API call
                try {
                    // Simulate API call
                    const userData = {
                        id: 'user123',
                        username: username,
                        email: email,
                        profilePic: 'assets/default-avatar.png'
                    };
                    
                    // Store user data
                    localStorage.setItem('userInfo', JSON.stringify(userData));
                    localStorage.setItem('token', 'fake-jwt-token');
                    
                    return userData;
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
