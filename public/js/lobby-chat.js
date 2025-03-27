// Lobby Chat Module
const LobbyChat = {
    socket: null,
    lobbyId: null,
    messages: [],
    
    init(lobbyId) {
        this.lobbyId = lobbyId;
        this.socket = io(window.location.origin);
        this.setupSocketListeners();
        this.setupChatUI();
    },

    setupSocketListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to chat server');
            this.socket.emit('joinLobby', this.lobbyId);
        });

        // Chat events
        this.socket.on('chatMessage', (message) => {
            this.addMessageToChat(message);
        });

        // Player events
        this.socket.on('playerJoined', (data) => {
            this.addSystemMessage(`${data.player.username} has joined the lobby`);
            this.updatePlayersList(data.lobby.players);
        });

        this.socket.on('playerLeft', (data) => {
            this.addSystemMessage(`${data.player.username} has left the lobby`);
            this.updatePlayersList(data.lobby.players);
        });
    },

    setupChatUI() {
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';
        chatContainer.innerHTML = `
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-container">
                <input type="text" id="chatInput" placeholder="Type your message...">
                <button id="sendMessage">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;

        document.querySelector('.lobby-chat').appendChild(chatContainer);

        // Setup event listeners
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessage');

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim()) {
                this.sendMessage(chatInput.value);
                chatInput.value = '';
            }
        });

        sendButton.addEventListener('click', () => {
            if (chatInput.value.trim()) {
                this.sendMessage(chatInput.value);
                chatInput.value = '';
            }
        });
    },

    sendMessage(content) {
        if (!content.trim()) return;

        const message = {
            lobbyId: this.lobbyId,
            content: content.trim(),
            timestamp: new Date()
        };

        this.socket.emit('chatMessage', message);
    },

    addMessageToChat(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.isSystem ? 'system' : ''}`;
        
        messageElement.innerHTML = `
            ${!message.isSystem ? `<span class="username">${message.username}:</span>` : ''}
            <span class="content">${this.escapeHtml(message.content)}</span>
            <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
        `;

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    addSystemMessage(content) {
        this.addMessageToChat({
            content,
            isSystem: true,
            timestamp: new Date()
        });
    },

    updatePlayersList(players) {
        const playersList = document.querySelector('.players-list');
        if (!playersList) return;

        playersList.innerHTML = players.map(player => `
            <div class="player-item">
                <i class="fas fa-user"></i>
                <span>${this.escapeHtml(player.user.username)}</span>
                ${player.ready ? '<i class="fas fa-check text-success"></i>' : ''}
            </div>
        `).join('');
    },

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Export the module
window.LobbyChat = LobbyChat; 