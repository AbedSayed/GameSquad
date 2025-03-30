// Chat related JavaScript functions using Socket.io

// Socket.io instance
let socket;

// Current user info
let currentUser;

// Map to store active conversations
const activeConversations = new Map();

// Initialize socket connection
function initializeSocket() {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No authentication token found');
    return false;
  }
  

  currentUser = Auth.getCurrentUser();
  
  if (!currentUser) {
    console.error('No user info found');
    return false;
  }
  

  socket = io(window.location.origin, {
    auth: {
      token: token
    }
  });
  

  setupSocketListeners();
  
  return true;
}


function setupSocketListeners() {
  // Connection events
  socket.on('connect', () => {
    console.log('Connected to chat server');
    updateUserStatus('online');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    showNotification('Chat connection error: ' + error.message, 'error');
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from chat server');
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    showNotification('Chat error: ' + error.message, 'error');
  });
  
  // User events
  socket.on('onlineUsers', (users) => {
    updateOnlineUsersUI(users);
  });
  
  socket.on('userStatusChanged', (data) => {
    updateUserStatusUI(data.userId, data.status);
  });
  
  // Lobby chat events
  socket.on('newLobbyChatMessage', (data) => {
    addLobbyMessageToUI(data.lobbyId, data.message);
  });
  
  socket.on('userJoinedLobby', (data) => {
    addSystemMessageToLobbyUI(data.lobbyId, `${data.user.displayName} joined the lobby`);
    updateLobbyMembersUI(data.lobbyId);
  });
  
  socket.on('userLeftLobby', (data) => {
    addSystemMessageToLobbyUI(data.lobbyId, `A user left the lobby`);
    updateLobbyMembersUI(data.lobbyId);
  });
  
  socket.on('userTyping', (data) => {
    updateTypingIndicatorUI(data.lobbyId, data.user, data.isTyping);
  });
  
  // Private chat events
  socket.on('newPrivateMessage', (message) => {
    addPrivateMessageToUI(message);
  });
  
  socket.on('userPrivateTyping', (data) => {
    updatePrivateTypingIndicatorUI(data.user, data.isTyping);
  });
  
  // Invitation events
  socket.on('newLobbyInvitation', (data) => {
    showLobbyInvitationUI(data);
  });
}

// Join a lobby chat room
function joinLobbyChatRoom(lobbyId) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('joinLobby', lobbyId);
  console.log('Joined lobby chat room:', lobbyId);
  return true;
}

// Leave a lobby chat room
function leaveLobbyChat(lobbyId) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('leaveLobby', lobbyId);
  console.log('Left lobby chat room:', lobbyId);
  return true;
}

// Send message to lobby chat
function sendLobbyMessage(lobbyId, message) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('lobbyChatMessage', { lobbyId, message });
  return true;
}

// Send private message
function sendPrivateMessage(recipientId, message) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('privateMessage', { recipientId, message });
  return true;
}

// Send lobby invitation
function sendLobbyInvitation(lobbyId, recipientId) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('lobbyInvitation', { lobbyId, recipientId });
  return true;
}

// Update user status
function updateUserStatus(status) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('updateStatus', status);
  return true;
}

// Send typing indicator for lobby chat
function sendLobbyTypingIndicator(lobbyId, isTyping) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('lobbyTyping', { lobbyId, isTyping });
  return true;
}

// Send typing indicator for private chat
function sendPrivateTypingIndicator(recipientId, isTyping) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('privateTyping', { recipientId, isTyping });
  return true;
}

// Disconnect socket
function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log('Disconnected from chat server');
  }
}

// UI update functions - These will be implemented based on the actual UI elements

// Update online users UI
function updateOnlineUsersUI(users) {
  console.log('Online users:', users);
  // Implementation will depend on UI structure
}

// Update user status UI
function updateUserStatusUI(userId, status) {
  console.log('User status changed:', userId, status);
  // Implementation will depend on UI structure
}

// Add lobby message to UI
function addLobbyMessageToUI(lobbyId, message) {
  console.log('New lobby message:', lobbyId, message);
  
  // Get chat container
  const chatContainer = document.getElementById(`lobby-chat-${lobbyId}`);
  if (!chatContainer) return;
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message');
  
  // Add sender's name and message
  messageElement.innerHTML = `
    <span class="message-sender">${message.user.displayName}</span>
    <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
    <p class="message-text">${message.text}</p>
  `;
  
  // Add appropriate class if message is from current user
  if (message.user._id === currentUser._id) {
    messageElement.classList.add('my-message');
  } else {
    messageElement.classList.add('other-message');
  }
  
  // Append message to chat container
  chatContainer.appendChild(messageElement);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add system message to lobby UI
function addSystemMessageToLobbyUI(lobbyId, message) {
  console.log('System message:', lobbyId, message);
  
  // Get chat container
  const chatContainer = document.getElementById(`lobby-chat-${lobbyId}`);
  if (!chatContainer) return;
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', 'system-message');
  
  // Add message
  messageElement.innerHTML = `
    <p class="message-text">${message}</p>
  `;
  
  // Append message to chat container
  chatContainer.appendChild(messageElement);
  
  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Update lobby members UI
function updateLobbyMembersUI(lobbyId) {
  console.log('Update lobby members:', lobbyId);
  // Implementation will depend on UI structure
  // This would typically refresh the lobby details
}

// Update typing indicator UI for lobby chat
function updateTypingIndicatorUI(lobbyId, user, isTyping) {
  console.log('Typing indicator:', lobbyId, user, isTyping);
  
  // Get typing indicator element
  const typingIndicator = document.getElementById(`typing-indicator-${lobbyId}`);
  if (!typingIndicator) return;
  
  if (isTyping) {
    typingIndicator.textContent = `${user.username} is typing...`;
    typingIndicator.style.display = 'block';
  } else {
    typingIndicator.style.display = 'none';
  }
}

// Add private message to UI
function addPrivateMessageToUI(message) {
  console.log('New private message:', message);
  
  // Determine the conversation ID (combination of sender and recipient IDs)
  let conversationId;
  let otherUser;
  
  if (message.sender._id === currentUser._id) {
    // Message sent by current user
    conversationId = `chat-${currentUser._id}-${message.recipient._id}`;
    otherUser = message.recipient;
  } else {
    // Message received by current user
    conversationId = `chat-${currentUser._id}-${message.sender._id}`;
    otherUser = message.sender;
  }
  
  // Store conversation in active conversations if not already there
  if (!activeConversations.has(conversationId)) {
    activeConversations.set(conversationId, {
      user: otherUser,
      messages: []
    });
  }
  
  // Add message to conversation
  const conversation = activeConversations.get(conversationId);
  conversation.messages.push(message);
  
  // Update UI if conversation is currently open
  const chatContainer = document.getElementById(conversationId);
  if (chatContainer) {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    // Add sender's name and message
    messageElement.innerHTML = `
      <span class="message-sender">${message.sender.displayName}</span>
      <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
      <p class="message-text">${message.text}</p>
    `;
    
    // Add appropriate class if message is from current user
    if (message.sender._id === currentUser._id) {
      messageElement.classList.add('my-message');
    } else {
      messageElement.classList.add('other-message');
    }
    
    // Append message to chat container
    chatContainer.appendChild(messageElement);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // Show notification if message is from other user and conversation not open
  if (message.sender._id !== currentUser._id && !chatContainer) {
    showNotification(`New message from ${message.sender.displayName}`, 'info');
    // Update conversations list UI
    updateConversationsListUI();
  }
}

// Update private typing indicator UI
function updatePrivateTypingIndicatorUI(user, isTyping) {
  console.log('Private typing indicator:', user, isTyping);
  
  // Determine the conversation ID
  const conversationId = `chat-${currentUser._id}-${user._id}`;
  
  // Get typing indicator element
  const typingIndicator = document.getElementById(`typing-indicator-${conversationId}`);
  if (!typingIndicator) return;
  
  if (isTyping) {
    typingIndicator.textContent = `${user.username} is typing...`;
    typingIndicator.style.display = 'block';
  } else {
    typingIndicator.style.display = 'none';
  }
}

// Show lobby invitation UI
function showLobbyInvitationUI(data) {
  console.log('New lobby invitation:', data);
  
  // Show notification
  showNotification(`${data.inviter.displayName} invited you to join a lobby`, 'info');
  
  // Implementation will depend on UI structure
  // This would typically show a notification or update invitations list
}

// Update conversations list UI
function updateConversationsListUI() {
  console.log('Update conversations list');
  // Implementation will depend on UI structure
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`Notification (${type}):`, message);
  
  // Implementation will depend on UI structure
  // This could be a toast notification or alert
}

// Initialize chat on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (Auth.isLoggedIn()) {
    // Initialize socket connection
    const success = initializeSocket();
    
    if (!success) {
      console.error('Failed to initialize chat');
      showNotification('Failed to connect to chat server', 'error');
    }
    
    // Set up event listeners for chat UI
    setupChatEventListeners();
  }
});

// Set up event listeners for chat UI
function setupChatEventListeners() {
  // This function will be implemented based on the actual UI elements
  console.log('Setting up chat event listeners');
  
  // Example: Set up lobby chat form
  const lobbyChatForm = document.getElementById('lobby-chat-form');
  if (lobbyChatForm) {
    lobbyChatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const lobbyId = this.dataset.lobbyId;
      const messageInput = this.querySelector('input[name="message"]');
      const message = messageInput.value.trim();
      
      if (message) {
        sendLobbyMessage(lobbyId, message);
        messageInput.value = '';
      }
    });
  }
  
  // Example: Set up private chat form
  const privateChatForm = document.getElementById('private-chat-form');
  if (privateChatForm) {
    privateChatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const recipientId = this.dataset.recipientId;
      const messageInput = this.querySelector('input[name="message"]');
      const message = messageInput.value.trim();
      
      if (message) {
        sendPrivateMessage(recipientId, message);
        messageInput.value = '';
      }
    });
  }
  
  // Example: Set up typing indicators
  const chatInputs = document.querySelectorAll('.chat-input');
  chatInputs.forEach(input => {
    let typingTimeout;
    
    input.addEventListener('input', function() {
      const chatType = this.dataset.chatType; // 'lobby' or 'private'
      const targetId = this.dataset.targetId; // lobbyId or recipientId
      
      // Clear previous timeout
      clearTimeout(typingTimeout);
      
      // Send typing indicator
      if (chatType === 'lobby') {
        sendLobbyTypingIndicator(targetId, true);
      } else if (chatType === 'private') {
        sendPrivateTypingIndicator(targetId, true);
      }
      
      // Set timeout to stop typing indicator after 2 seconds of inactivity
      typingTimeout = setTimeout(() => {
        if (chatType === 'lobby') {
          sendLobbyTypingIndicator(targetId, false);
        } else if (chatType === 'private') {
          sendPrivateTypingIndicator(targetId, false);
        }
      }, 2000);
    });
  });
  
  // Example: Set up status selector
  const statusSelector = document.getElementById('status-selector');
  if (statusSelector) {
    statusSelector.addEventListener('change', function() {
      updateUserStatus(this.value);
    });
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  disconnectSocket();
});

// Export functions
window.Chat = {
  initializeSocket,
  joinLobbyChatRoom,
  leaveLobbyChat,
  sendLobbyMessage,
  sendPrivateMessage,
  sendLobbyInvitation,
  updateUserStatus,
  disconnectSocket
};
