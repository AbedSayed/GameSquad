
let socket;

let currentUser;

const activeConversations = new Map();

function initializeSocket() {
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
  
  socket.on('onlineUsers', (users) => {
    updateOnlineUsersUI(users);
  });
  
  socket.on('userStatusChanged', (data) => {
    updateUserStatusUI(data.userId, data.status);
  });
  
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
  
  socket.on('newPrivateMessage', (message) => {
    addPrivateMessageToUI(message);
  });
  
  socket.on('userPrivateTyping', (data) => {
    updatePrivateTypingIndicatorUI(data.user, data.isTyping);
  });
  
  socket.on('newLobbyInvitation', (data) => {
    showLobbyInvitationUI(data);
  });
}

function joinLobbyChatRoom(lobbyId) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('joinLobby', lobbyId);
  console.log('Joined lobby chat room:', lobbyId);
  return true;
}

function leaveLobbyChat(lobbyId) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('leaveLobby', lobbyId);
  console.log('Left lobby chat room:', lobbyId);
  return true;
}

function sendLobbyMessage(lobbyId, message) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('lobbyChatMessage', { lobbyId, message });
  return true;
}

function sendPrivateMessage(recipientId, message) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('privateMessage', { recipientId, message });
  return true;
}

function sendLobbyInvitation(lobbyId, recipientId) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('lobbyInvitation', { lobbyId, recipientId });
  return true;
}

function updateUserStatus(status) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('updateStatus', status);
  return true;
}

function sendLobbyTypingIndicator(lobbyId, isTyping) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('lobbyTyping', { lobbyId, isTyping });
  return true;
}

function sendPrivateTypingIndicator(recipientId, isTyping) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    return false;
  }
  
  socket.emit('privateTyping', { recipientId, isTyping });
  return true;
}

function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log('Disconnected from chat server');
  }
}


function updateOnlineUsersUI(users) {
  console.log('Online users:', users);
}

function updateUserStatusUI(userId, status) {
  console.log('User status changed:', userId, status);
}

function addLobbyMessageToUI(lobbyId, message) {
  console.log('New lobby message:', lobbyId, message);
  
  const chatContainer = document.getElementById(`lobby-chat-${lobbyId}`);
  if (!chatContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message');
  
  messageElement.innerHTML = `
    <span class="message-sender">${message.user.displayName}</span>
    <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
    <p class="message-text">${message.text}</p>
  `;
  
  if (message.user._id === currentUser._id) {
    messageElement.classList.add('my-message');
  } else {
    messageElement.classList.add('other-message');
  }
  
  chatContainer.appendChild(messageElement);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addSystemMessageToLobbyUI(lobbyId, message) {
  console.log('System message:', lobbyId, message);
  
  const chatContainer = document.getElementById(`lobby-chat-${lobbyId}`);
  if (!chatContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', 'system-message');
  
  messageElement.innerHTML = `
    <p class="message-text">${message}</p>
  `;
  
  chatContainer.appendChild(messageElement);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updateLobbyMembersUI(lobbyId) {
  console.log('Update lobby members:', lobbyId);

}

function updateTypingIndicatorUI(lobbyId, user, isTyping) {
  console.log('Typing indicator:', lobbyId, user, isTyping);
  
  const typingIndicator = document.getElementById(`typing-indicator-${lobbyId}`);
  if (!typingIndicator) return;
  
  if (isTyping) {
    typingIndicator.textContent = `${user.username} is typing...`;
    typingIndicator.style.display = 'block';
  } else {
    typingIndicator.style.display = 'none';
  }
}

function addPrivateMessageToUI(message) {
  console.log('New private message:', message);
  
  let conversationId;
  let otherUser;
  
  if (message.sender._id === currentUser._id) {
    conversationId = `chat-${currentUser._id}-${message.recipient._id}`;
    otherUser = message.recipient;
  } else {
    conversationId = `chat-${currentUser._id}-${message.sender._id}`;
    otherUser = message.sender;
  }
  
  if (!activeConversations.has(conversationId)) {
    activeConversations.set(conversationId, {
      user: otherUser,
      messages: []
    });
  }
  
  const conversation = activeConversations.get(conversationId);
  conversation.messages.push(message);
  
  const chatContainer = document.getElementById(conversationId);
  if (chatContainer) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    messageElement.innerHTML = `
      <span class="message-sender">${message.sender.displayName}</span>
      <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
      <p class="message-text">${message.text}</p>
    `;
    
    if (message.sender._id === currentUser._id) {
      messageElement.classList.add('my-message');
    } else {
      messageElement.classList.add('other-message');
    }
    
    chatContainer.appendChild(messageElement);
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  if (message.sender._id !== currentUser._id && !chatContainer) {
    showNotification(`New message from ${message.sender.displayName}`, 'info');
    updateConversationsListUI();
  }
}

function updatePrivateTypingIndicatorUI(user, isTyping) {
  console.log('Private typing indicator:', user, isTyping);
  
  const conversationId = `chat-${currentUser._id}-${user._id}`;
  
  const typingIndicator = document.getElementById(`typing-indicator-${conversationId}`);
  if (!typingIndicator) return;
  
  if (isTyping) {
    typingIndicator.textContent = `${user.username} is typing...`;
    typingIndicator.style.display = 'block';
  } else {
    typingIndicator.style.display = 'none';
  }
}

function showLobbyInvitationUI(data) {
  console.log('New lobby invitation:', data);
  
  showNotification(`${data.inviter.displayName} invited you to join a lobby`, 'info');
  
}

function updateConversationsListUI() {
  console.log('Update conversations list');
}

function showNotification(message, type = 'info') {
  console.log(`Notification (${type}):`, message);
  
}

document.addEventListener('DOMContentLoaded', function() {
  if (Auth.isLoggedIn()) {
    const success = initializeSocket();
    
    if (!success) {
      console.error('Failed to initialize chat');
      showNotification('Failed to connect to chat server', 'error');
    }
    
    setupChatEventListeners();
  }
});

function setupChatEventListeners() {
  console.log('Setting up chat event listeners');
  
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
  
  const chatInputs = document.querySelectorAll('.chat-input');
  chatInputs.forEach(input => {
    let typingTimeout;
    
    input.addEventListener('input', function() {
      const chatType = this.dataset.chatType;
      const targetId = this.dataset.targetId;
      
      clearTimeout(typingTimeout);
      

      if (chatType === 'lobby') {
        sendLobbyTypingIndicator(targetId, true);
      } else if (chatType === 'private') {
        sendPrivateTypingIndicator(targetId, true);
      }
      
      typingTimeout = setTimeout(() => {
        if (chatType === 'lobby') {
          sendLobbyTypingIndicator(targetId, false);
        } else if (chatType === 'private') {
          sendPrivateTypingIndicator(targetId, false);
        }
      }, 2000);
    });
  });
  
  const statusSelector = document.getElementById('status-selector');
  if (statusSelector) {
    statusSelector.addEventListener('change', function() {
      updateUserStatus(this.value);
    });
  }
}

window.addEventListener('beforeunload', function() {
  disconnectSocket();
});

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
