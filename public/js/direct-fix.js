/**
 * Direct fix for the JOIN LOBBY buttons in the Popular Games section 
 * as shown in the screenshot
 */

(function() {
    fixPopularGameButtons();
    
    document.addEventListener('DOMContentLoaded', fixPopularGameButtons);
    
    function fixPopularGameButtons() {
        const sections = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .filter(heading => heading.textContent.trim().toUpperCase() === 'POPULAR GAMES')
            .map(heading => heading.closest('section'));
        
        if (sections.length === 0) {
            console.log('No POPULAR GAMES section found');
            return;
        }
        
        sections.forEach(section => {
            console.log('Found POPULAR GAMES section, fixing buttons...');
            
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
            
            const joinButtons = Array.from(section.querySelectorAll('a, button')).filter(el =>
                el.textContent.trim().toUpperCase().includes('JOIN LOBBY')
            );
            
            joinButtons.forEach(button => {
                let gameCard = button.closest('.game-card');
                if (!gameCard) {
                    gameCard = button.closest('.card, .game-tile, .game');
                }
                
                if (!gameCard) {
                    console.log('Could not find parent card for button:', button);
                    return;
                }
                
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
                
                const gameCode = gameMap[gameName] || gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                console.log(`Fixing button for game: ${gameName} (${gameCode})`);
                
                if (button.tagName === 'A') {
                    let basePath = '';
                    if (window.location.pathname.includes('/pages/')) {
                        basePath = './';
                    } else {
                        basePath = 'pages/';
                    }
                    
                    button.href = `${basePath}lobbies.html?game=${gameCode}`;
                } else {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        let basePath = '';
                        if (window.location.pathname.includes('/pages/')) {
                            basePath = './';
                        } else {
                            basePath = 'pages/';
                        }
                        
                        window.location.href = `${basePath}lobbies.html?game=${gameCode}`;
                    });
                }
                
                console.log(`Fixed button for ${gameName}`);
            });
        });
    }
})(); 