// Lobbies namespace
window.Lobby = {
    // Function to load lobbies with filters
    async loadLobbies(filters = {}) {
        try {
            // Show loading state
            const container = document.querySelector('.lobbies-grid');
            container.innerHTML = '<div class="loading">Loading lobbies...</div>';

            // Construct query parameters
            const queryParams = new URLSearchParams();
            if (filters.game && filters.game !== 'All Games') queryParams.append('game', filters.game);
            if (filters.rank && filters.rank !== 'Any Rank') queryParams.append('rank', filters.rank);
            if (filters.language && filters.language !== 'Any Language') queryParams.append('language', filters.language);
            if (filters.status && filters.status !== 'Any Status') queryParams.append('status', filters.status);

            // Make API request
            const response = await fetch(`${APP_CONFIG.API_URL}/lobbies?${queryParams}`);
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load lobbies');
            }

            // Display lobbies using the data property from the response
            this.displayLobbies(result.data);
        } catch (error) {
            console.error('Error loading lobbies:', error);
            const container = document.querySelector('.lobbies-grid');
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load lobbies. Please try again later.</p>
                    <button onclick="window.Lobby.loadLobbies()" class="retry-btn">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    },

    // Function to display lobbies
    displayLobbies(data) {
        const container = document.querySelector('.lobbies-grid');
        container.innerHTML = ''; // Clear existing lobbies

        if (!data || !data.length) {
            container.innerHTML = `
                <div class="no-lobbies">
                    <i class="fas fa-users-slash"></i>
                    <h3>No Lobbies Found</h3>
                    <p>Be the first to create a lobby!</p>
                    <a href="create-lobby.html" class="create-lobby-btn">
                        <i class="fas fa-plus"></i> Create Lobby
                    </a>
                </div>
            `;
            return;
        }

        data.forEach(lobby => {
            const lobbyCard = document.createElement('div');
            lobbyCard.className = 'lobby-card';
            lobbyCard.innerHTML = `
                <div class="lobby-header">
                    <div class="lobby-game">
                        <span>${this.escapeHtml(lobby.gameType)}</span>
                    </div>
                    <span class="lobby-status status-${lobby.status}">${lobby.status}</span>
                </div>
                <div class="lobby-body">
                    <h3 class="lobby-name">${this.escapeHtml(lobby.name)}</h3>
                    <div class="lobby-info">
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <span>Host: ${this.escapeHtml(lobby.host.username)}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>Players: ${lobby.currentPlayers}/${lobby.maxPlayers}</span>
                        </div>
                    </div>
                    <div class="lobby-actions">
                        <button class="lobby-btn join-btn" data-lobby-id="${lobby._id}">
                            <i class="fas fa-sign-in-alt"></i> Join
                        </button>
                        <a href="lobby.html?id=${lobby._id}" class="lobby-btn details-btn">
                            <i class="fas fa-info-circle"></i> Details
                        </a>
                    </div>
                </div>
            `;

            container.appendChild(lobbyCard);
        });

        // Add event listeners to join buttons
        this.setupJoinButtons();
    },

    // Function to setup join button handlers
    setupJoinButtons() {
        const joinButtons = document.querySelectorAll('.join-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const lobbyId = e.target.closest('.join-btn').dataset.lobbyId;
                await this.joinLobby(lobbyId);
            });
        });
    },

    // Function to join a lobby
    async joinLobby(lobbyId) {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const response = await fetch(`${APP_CONFIG.API_URL}/lobbies/${lobbyId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to join lobby');
            }

            // Redirect to the lobby page
            window.location.href = `lobby.html?id=${lobbyId}`;
        } catch (error) {
            console.error('Error joining lobby:', error);
            this.showNotification(error.message, 'error');
        }
    },

    // Function to show notifications
    showNotification(message, type = 'error') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.notifications-container');
        container.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    },

    // Helper function to escape HTML
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Load initial lobbies
    window.Lobby.loadLobbies();

    // Setup filter form
    const filterForm = document.getElementById('filters-form');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const filters = {
                game: document.getElementById('game-filter').value,
                rank: document.getElementById('rank-filter').value,
                language: document.getElementById('language-filter').value,
                status: document.getElementById('status-filter').value
            };
            window.Lobby.loadLobbies(filters);
        });

        // Setup reset button
        const resetButton = filterForm.querySelector('.reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                filterForm.reset();
                window.Lobby.loadLobbies();
            });
        }
    }

    // Setup toggle filters button
    const toggleFiltersBtn = document.getElementById('toggle-filters');
    if (toggleFiltersBtn) {
        toggleFiltersBtn.addEventListener('click', () => {
            filterForm.classList.toggle('hidden');
        });
    }
});
