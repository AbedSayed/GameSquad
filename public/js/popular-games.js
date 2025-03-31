/**
 * Handles the Popular Games section on the dashboard
 * Ensures all JOIN LOBBY buttons link to their specific game lobbies
 */

document.addEventListener('DOMContentLoaded', function() {
    setupPopularGamesLinks();
});

/**
 * Sets up links for the Popular Games section
 */
function setupPopularGamesLinks() {
    // Find the popular games section
    const section = document.querySelector('.popular-games');
    if (!section) {
        console.log('Popular games section not found');
        return;
    }

    console.log('Setting up Popular Games section links');

    // Map of game names to their codes
    const gameMap = {
        'VALORANT': 'valorant',
        'COUNTER-STRIKE 2': 'csgo',
        'LEAGUE OF LEGENDS': 'lol',
        'APEX LEGENDS': 'apex',
        'FORTNITE': 'fortnite',
        'DOTA 2': 'dota2',
        'OVERWATCH 2': 'overwatch',
        'ROCKET LEAGUE': 'rocketleague'
    };

    // Find all game cards in the section
    const gameCards = section.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        // Find the game title
        const title = card.querySelector('h3, h4, .game-title');
        if (!title) {
            console.log('Game title not found in card:', card);
            return;
        }

        const gameName = title.textContent.trim().toUpperCase();
        const gameCode = gameMap[gameName] || gameName.toLowerCase().replace(/[^a-z0-9]/g, '');

        console.log(`Found game: ${gameName}, code: ${gameCode}`);

        // Find the join button
        const joinButton = card.querySelector('a.join-btn, a.join-lobby, button.join-btn, button.join-lobby');
        if (!joinButton) {
            console.log('Join button not found for game:', gameName);
            return;
        }

        // Update the button link
        if (joinButton.tagName === 'A') {
            joinButton.href = `pages/lobbies.html?game=${gameCode}`;
            console.log(`Updated link for ${gameName} to: pages/lobbies.html?game=${gameCode}`);
        } else {
            // For button elements, add a click event listener
            joinButton.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = `pages/lobbies.html?game=${gameCode}`;
            });
            console.log(`Added click handler for ${gameName}`);
        }
    });
} 