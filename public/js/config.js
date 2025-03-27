// Global application configuration
window.APP_CONFIG = {
    API_URL: '/api',
    SOCKET_URL: window.location.origin,
    APP_NAME: 'GameSquad',
    DEFAULT_GAME_TYPES: ['FPS', 'MOBA', 'RPG', 'Strategy', 'Sports', 'Racing', 'Other']
};

// Log that configuration was loaded successfully
console.log('Configuration loaded successfully:', window.APP_CONFIG);

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
} 