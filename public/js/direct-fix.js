/**
 * Direct fix for the JOIN LOBBY buttons in the Popular Games section 
 * as shown in the screenshot
 */

(function() {
    // Execute immediately to fix the issue as quickly as possible
    fixPopularGameButtons();
    
    // Also execute on DOMContentLoaded to ensure it works if loaded early
    document.addEventListener('DOMContentLoaded', fixPopularGameButtons);
    
    function fixPopularGameButtons() {
        // Find all sections with "POPULAR GAMES" heading
        const sections = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .filter(heading => heading.textContent.trim().toUpperCase() === 'POPULAR GAMES')
            .map(heading => heading.closest('section'));
        
        if (sections.length === 0) {
            console.log('No POPULAR GAMES section found');
            return;
        }
        
        sections.forEach(section => {
            console.log('Found POPULAR GAMES section, fixing buttons...');
            
            // Game name to code mapping
            const gameMap = {
                'VALORANT': 'valorant',
                'COUNTER-STRIKE 2': 'csgo',
                'COUNTER-STRIKE': 'csgo',
                'CS2': 'csgo',
                'LEAGUE OF LEGENDS': 'lol',
                'LOL': 'lol',
                'APEX LEGENDS': 'apex',
                'APEX': 'apex',
                'FORTNITE': 'fortnite',
                'DOTA 2': 'dota2',
                'DOTA': 'dota2',
                'OVERWATCH 2': 'overwatch',
                'OVERWATCH': 'overwatch',
                'ROCKET LEAGUE': 'rocketleague'
            };
            
            // Find all buttons with "JOIN LOBBY" text
            const joinButtons = Array.from(section.querySelectorAll('a, button')).filter(el => 
                el.textContent.trim().toUpperCase().includes('JOIN LOBBY')
            );
            
            joinButtons.forEach(button => {
                // Find the game name by looking at parent elements
                let gameCard = button.closest('.game-card');
                if (!gameCard) {
                    // Try other common container classes
                    gameCard = button.closest('.card, .game-tile, .game');
                }
                
                if (!gameCard) {
                    console.log('Could not find parent card for button:', button);
                    return;
                }
                
                // Try to get the game name from the card's heading or image alt text
                let gameName = '';
                const heading = gameCard.querySelector('h1, h2, h3, h4, h5, h6');
                if (heading) {
                    gameName = heading.textContent.trim().toUpperCase();
                } else {
                    const image = gameCard.querySelector('img');
                    if (image && image.alt) {
                        gameName = image.alt.trim().toUpperCase();
                    }
                }
                
                if (!gameName) {
                    console.log('Could not determine game name for button:', button);
                    return;
                }
                
                // Get the game code from the map or convert the name
                const gameCode = gameMap[gameName] || gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                console.log(`Fixing button for game: ${gameName} (${gameCode})`);
                
                // Update the link
                if (button.tagName === 'A') {
                    // Get the current path for links
                    let basePath = '';
                    if (window.location.pathname.includes('/pages/')) {
                        basePath = './'; // Same directory
                    } else {
                        basePath = 'pages/'; // From root or elsewhere
                    }
                    
                    button.href = `${basePath}lobbies.html?game=${gameCode}`;
                } else {
                    // For button elements, add a click event listener
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Same path logic as above
                        let basePath = '';
                        if (window.location.pathname.includes('/pages/')) {
                            basePath = './'; // Same directory
                        } else {
                            basePath = 'pages/'; // From root or elsewhere
                        }
                        
                        window.location.href = `${basePath}lobbies.html?game=${gameCode}`;
                    });
                }
                
                console.log(`Fixed button for ${gameName}`);
            });
        });
    }
})(); 