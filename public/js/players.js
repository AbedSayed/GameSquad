// We'll access APP_CONFIG directly rather than declaring constants
// to avoid redeclaration issues across multiple files

if (!window.APP_CONFIG?.API_URL) {
    console.error('APP_CONFIG.API_URL is not defined. Make sure config.js is loaded first.');
}

// DOM Elements
const playersContainer = document.getElementById('playersContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const sortSelect = document.getElementById('sortSelect');
const loadingSpinner = document.getElementById('loadingSpinner');
const noPlayersMessage = document.getElementById('noPlayersMessage');
const resetFiltersBtn = document.getElementById('resetFilters');
const toggleFiltersBtn = document.getElementById('toggleFilters');
const loginRegisterNav = document.getElementById('loginRegisterNav');
const userProfileNav = document.getElementById('userProfileNav');
const usernameSpan = document.querySelector('.username');
const filtersForm = document.querySelector('.filters-form');

// State
let players = [];
let filteredPlayers = [];
let currentPage = 1;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    initializePage();
    updateAuthUI();
    setupEventListeners();
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    if (searchBtn) {
        console.log('Adding search button listener');
        searchBtn.addEventListener('click', handleSearch);
    }
    
    if (sortSelect) {
        console.log('Adding sort select listener');
        sortSelect.addEventListener('change', handleSort);
    }
    
    if (resetFiltersBtn) {
        console.log('Adding reset filters listener');
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    if (toggleFiltersBtn) {
        console.log('Adding toggle filters listener');
        toggleFiltersBtn.addEventListener('click', toggleFilters);
    }
}

// Initialize page
async function initializePage() {
    console.log('Initializing page...');
    showLoading();
    try {
        console.log('Fetching players from:', `${window.APP_CONFIG.API_URL}/users/all`);
        const response = await fetch(`${window.APP_CONFIG.API_URL}/users/all`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch players');
        }
        
        const data = await response.json();
        console.log('Fetched data:', data);
        
        if (!Array.isArray(data)) {
            throw new Error('Invalid response format: expected an array of players');
        }
        
        players = data;
        console.log('Fetched players:', players.length);
        
        filteredPlayers = [...players];
        displayPlayers();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError(`Failed to load players: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Update UI based on authentication state
function updateAuthUI() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        loginRegisterNav.classList.add('hidden');
        userProfileNav.classList.remove('hidden');
        usernameSpan.textContent = currentUser.username;
    } else {
        loginRegisterNav.classList.remove('hidden');
        userProfileNav.classList.add('hidden');
    }
}

// Display players
function displayPlayers() {
    console.log('Displaying players...');
    if (!playersContainer) {
        console.error('Players container not found!');
        return;
    }

    if (filteredPlayers.length === 0) {
        showNoPlayersMessage();
        return;
    }
    
    hideNoPlayersMessage();
    playersContainer.innerHTML = '';
    
    const startIndex = (currentPage - 1) * window.APP_CONFIG.PLAYERS_PER_PAGE;
    const endIndex = startIndex + window.APP_CONFIG.PLAYERS_PER_PAGE;
    const currentPlayers = filteredPlayers.slice(startIndex, endIndex);
    
    currentPlayers.forEach(player => {
        const playerCard = createPlayerCard(player);
        playersContainer.appendChild(playerCard);
    });
    
    console.log('Displayed players:', currentPlayers.length);
}

// Create player card
function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    
    const profile = player.profile || {};
    const initials = player.username.slice(0, 2).toUpperCase();
    const joinDate = new Date(player.createdAt).toLocaleDateString();
    
    card.innerHTML = `
        <div class="player-header">
            <div class="player-info">
                <div class="player-avatar">${initials}</div>
                <h3 class="player-name">${profile.displayName || player.username}</h3>
            </div>
            <div class="player-status ${profile.isOnline ? 'online' : 'offline'}">
                ${profile.isOnline ? 'Online' : 'Offline'}
            </div>
        </div>
        <div class="player-body">
            <div class="info-item">
                <i class="fas fa-calendar"></i>
                <span>Joined: ${joinDate}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-trophy"></i>
                <span>Rank: ${profile.rank || 'Unranked'}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-gamepad"></i>
                <span>Games: ${profile.gamesPlayed || 0}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-star"></i>
                <span>Level: ${profile.level || 1}</span>
            </div>
            ${profile.bio ? `
            <div class="player-bio">
                <p>${profile.bio}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    card.addEventListener('click', () => viewProfile(player._id));
    return card;
}

// Search and filter functions
function handleSearch() {
    console.log('Handling search...');
    const searchTerm = searchInput.value.toLowerCase();
    filteredPlayers = players.filter(player => 
        player.username.toLowerCase().includes(searchTerm) ||
        (player.profile?.displayName || '').toLowerCase().includes(searchTerm) ||
        (player.profile?.bio || '').toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayPlayers();
}

function handleSort() {
    console.log('Handling sort...');
    const sortBy = sortSelect.value;
    filteredPlayers.sort((a, b) => {
        switch (sortBy) {
            case 'username':
                return a.username.localeCompare(b.username);
            case 'joinDate':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'level':
                return (b.profile?.level || 0) - (a.profile?.level || 0);
            case 'gamesPlayed':
                return (b.profile?.gamesPlayed || 0) - (a.profile?.gamesPlayed || 0);
            default:
                return 0;
        }
    });
    displayPlayers();
}

function resetFilters() {
    console.log('Resetting filters...');
    searchInput.value = '';
    sortSelect.value = 'username';
    filteredPlayers = [...players];
    currentPage = 1;
    displayPlayers();
}

function toggleFilters() {
    console.log('Toggle filters clicked');
    if (!filtersForm) {
        console.error('Filters form not found');
        return;
    }
    
    const isHidden = filtersForm.style.display === 'none';
    console.log('Current display:', filtersForm.style.display, 'isHidden:', isHidden);
    
    filtersForm.style.display = isHidden ? 'grid' : 'none';
    toggleFiltersBtn.textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    
    console.log('New display:', filtersForm.style.display);
}

// Profile viewing
function viewProfile(playerId) {
    window.location.href = `profile.html?id=${playerId}`;
}

// Loading and error handling
function showLoading() {
    loadingSpinner?.classList.remove('d-none');
}

function hideLoading() {
    loadingSpinner?.classList.add('d-none');
}

function showNoPlayersMessage() {
    noPlayersMessage?.classList.remove('d-none');
}

function hideNoPlayersMessage() {
    noPlayersMessage?.classList.add('d-none');
}

function showError(message) {
    console.error('Error:', message);
    const errorAlert = document.createElement('div');
    errorAlert.className = 'alert alert-danger';
    errorAlert.textContent = message;
    playersContainer?.appendChild(errorAlert);
} 