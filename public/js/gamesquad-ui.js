/**
 * GameSquad UI - Shared animations and functionality
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeAnimations();
  applyGlowEffects();
  initializeMobileMenu();
  updateAuthUI();
  
  // Apply particle effect to the body for a consistent animated background across all pages
  applyParticleEffect('body');
  
  // Apply particle effect to the features section specifically
  const featuresSection = document.querySelector('.features');
  if (featuresSection) {
    applyParticleEffect('.features');
    
    // Add a pulsing glow effect to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
      card.classList.add('glow-effect');
    });
  }
  
  // Initialize global UI components on page load
  console.log('Initializing global UI components');
  initGlobalFriendsSidebar();
});

/**
 * Check for authentication and update UI accordingly
 */
function updateAuthUI() {
  // Check if user is authenticated
  const userInfoStr = localStorage.getItem('userInfo');
  const token = localStorage.getItem('token');
  
  const isAuthenticated = userInfoStr && token;
  
  // Update UI based on auth state
  const authOnlyElements = document.querySelectorAll('.auth-only');
  const nonAuthOnlyElements = document.querySelectorAll('.non-auth-only');
  
  // Show elements that should only be visible to authenticated users
  authOnlyElements.forEach(elem => {
    elem.classList.toggle('visible', isAuthenticated);
    elem.style.display = isAuthenticated ? 'block' : 'none';
  });
  
  // Hide elements that should not be visible to authenticated users
  nonAuthOnlyElements.forEach(elem => {
    elem.classList.toggle('hidden', isAuthenticated);
    elem.style.display = isAuthenticated ? 'none' : 'block';
  });
  
  // Update user profile display
  const userProfileElem = document.querySelector('.user-profile');
  if (userProfileElem) {
    if (isAuthenticated) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo?.username) {
          const usernameElem = userProfileElem.querySelector('.username');
          if (usernameElem) {
            // Remove the icon if present to avoid duplicating it
            const usernameText = userInfo.username;
            usernameElem.innerHTML = usernameText + ' <i class="fas fa-chevron-down"></i>';
          }
          
          // Update dropdown menu to ensure it doesn't have the My Lobbies option
          const dropdownMenu = userProfileElem.querySelector('.profile-dropdown');
          if (dropdownMenu) {
            // Check for My Lobbies link and remove it if found
            const myLobbiesLink = dropdownMenu.querySelector('a[href*="my-lobbies"]');
            if (myLobbiesLink) {
              myLobbiesLink.remove();
            }
          }
          
          userProfileElem.classList.remove('hidden');
        }
      } catch (e) {
        console.error('Error updating username display:', e);
      }
    } else {
      userProfileElem.classList.add('hidden');
    }
  }
}

/**
 * Mobile menu handling
 */
function initializeMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    
    // Close mobile menu when clicking a link
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }
}

/**
 * Navigation highlighting
 */
function initializeNavigation() {
  // Set active navigation item based on current page
  const currentLocation = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-links a');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    
    // Check if the current page matches this link
    if (currentLocation.includes(linkPath) && linkPath !== '/') {
      link.classList.add('active');
    } else if (currentLocation === '/' && (linkPath === '/' || linkPath === '/index.html')) {
      link.classList.add('active');
    }
  });
}

/**
 * Initialize animations
 */
function initializeAnimations() {
  // Apply data-text attribute for glow effects
  const heroTitle = document.querySelector('.hero-content h1');
  if (heroTitle) {
    heroTitle.setAttribute('data-text', heroTitle.textContent);
  }
  
  // Apply fade-in animations to cards and sections
  const animatedElements = document.querySelectorAll('.card, .hero-content, .feature-card, .section-title');
  
  // Only run if IntersectionObserver is supported
  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    const appearOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -100px 0px"
    };
    
    const appearOnScroll = new IntersectionObserver(function(entries, appearOnScroll) {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('appear');
        appearOnScroll.unobserve(entry.target);
      });
    }, appearOptions);
    
    animatedElements.forEach(element => {
      element.classList.add('fade-element');
      appearOnScroll.observe(element);
    });
  }
}

/**
 * Apply glow effects to buttons and elements
 */
function applyGlowEffects() {
  // Add glow effect to all buttons when hovered
  const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
  
  buttons.forEach(button => {
    button.addEventListener('mouseover', createButtonGlow);
    button.addEventListener('mouseout', removeButtonGlow);
  });
}

/**
 * Creates a glow effect around a button
 */
function createButtonGlow(e) {
  const button = e.currentTarget;
  const isPrimary = button.classList.contains('btn-primary');
  
  // Create glow element
  const glow = document.createElement('div');
  glow.classList.add('button-glow');
  
  // Position it absolutely relative to the button
  glow.style.position = 'absolute';
  glow.style.width = '100%';
  glow.style.height = '100%';
  glow.style.borderRadius = 'inherit';
  glow.style.zIndex = '-1';
  glow.style.opacity = '0';
  glow.style.transition = 'opacity 0.3s ease';
  
  // Set color based on button type
  if (isPrimary) {
    glow.style.boxShadow = '0 0 20px rgba(126, 34, 206, 0.7)';
  } else {
    glow.style.boxShadow = '0 0 20px rgba(34, 211, 238, 0.7)';
  }
  
  // Make sure button has relative positioning
  if (getComputedStyle(button).position === 'static') {
    button.style.position = 'relative';
  }
  
  // Add glow to button
  button.appendChild(glow);
  
  // Animate it in
  setTimeout(() => {
    glow.style.opacity = '1';
  }, 10);
}

/**
 * Removes the glow effect
 */
function removeButtonGlow(e) {
  const button = e.currentTarget;
  const glow = button.querySelector('.button-glow');
  
  if (glow) {
    glow.style.opacity = '0';
    
    // Remove after transition completes
    setTimeout(() => {
      glow.remove();
    }, 300);
  }
}

/**
 * Create notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
  let notificationsContainer = document.querySelector('.notifications-container');
  
  if (!notificationsContainer) {
    const container = document.createElement('div');
    container.classList.add('notifications-container');
    document.body.appendChild(container);
    notificationsContainer = container;
  }
  
  const notification = document.createElement('div');
  notification.classList.add('notification', `notification-${type}`);
  
  const iconClass = {
    'success': 'fa-check-circle',
    'error': 'fa-exclamation-circle',
    'info': 'fa-info-circle'
  }[type] || 'fa-info-circle';
  
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${iconClass} notification-icon"></i>
      <span class="notification-message">${message}</span>
    </div>
    <button class="notification-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  notificationsContainer.appendChild(notification);
  
  // Add slide-in animation
  setTimeout(() => {
    notification.classList.add('visible');
  }, 10);
  
  // Set up close button
  const closeButton = notification.querySelector('.notification-close');
  closeButton.addEventListener('click', () => {
    hideNotification(notification);
  });
  
  // Auto dismiss after duration
  setTimeout(() => {
    hideNotification(notification);
  }, duration);
}

/**
 * Hides and removes a notification
 */
function hideNotification(notification) {
  notification.classList.add('notification-hiding');
  
  setTimeout(() => {
    notification.remove();
  }, 300);
}

/**
 * Apply particle effect to an element
 * @param {string} selector - Element selector
 */
function applyParticleEffect(selector) {
  const element = document.querySelector(selector);
  if (!element) return;
  
  const isBody = selector === 'body';
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.classList.add('particle-canvas');
  
  // Different settings if applying to body vs other elements
  if (isBody) {
    canvas.style.position = 'fixed'; // Fixed position for body
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1'; // Behind content
    document.body.appendChild(canvas);
  } else {
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    
    // Make sure container has position relative
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(canvas);
  }
  
  // Set canvas dimensions
  const resizeCanvas = () => {
    if (isBody) {
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
    } else {
      canvas.width = element.offsetWidth;
      canvas.height = element.offsetHeight;
    }
  };
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Particle setup
  const ctx = canvas.getContext('2d');
  const particles = [];
  const particleCount = isBody ? 30 : 50; // Fewer particles for body to improve performance
  
  // Particle class
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = Math.random() * 0.5 - 0.25;
      this.speedY = Math.random() * 0.5 - 0.25;
      this.color = Math.random() > 0.5 ? 'rgba(126, 34, 206, 0.3)' : 'rgba(34, 211, 238, 0.3)';
    }
    
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      
      // Wrap around edges
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;
    }
    
    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Create initial particles
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Initialize friends sidebar on all pages
function initGlobalFriendsSidebar() {
    // Check if the sidebar already exists
    if (document.querySelector('.friends-sidebar')) return;
    
    // Create friends sidebar element
    const friendsSidebar = document.createElement('div');
    friendsSidebar.className = 'friends-sidebar collapsed';
    friendsSidebar.innerHTML = `
        <div class="friends-header">
            <h3>Friends</h3>
            <div class="friend-request-badge" style="display:none;">0</div>
            <button class="friends-toggle"><i class="fas fa-chevron-down"></i></button>
        </div>
        <div class="friends-list-container">
            <div class="friends-tabs">
                <button class="friends-tab active" data-tab="friends-list">Friends</button>
                <button class="friends-tab" data-tab="requests-list">Requests <span class="request-count"></span></button>
            </div>
            <div class="friends-search">
                <input type="text" placeholder="Search friends..." id="friends-search">
                <i class="fas fa-search"></i>
            </div>
            <div class="friends-list-wrapper">
                <div id="friends-list" class="tab-content active">
                    <!-- Friends will be populated here -->
                    <div class="loading-message">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading friends...</p>
                    </div>
                </div>
                <div id="requests-list" class="tab-content">
                    <!-- Friend requests will be populated here -->
                    <div class="empty-friends-message">
                        <i class="fas fa-user-plus"></i>
                        <p>No friend requests</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(friendsSidebar);
    
    // Add style for the friends sidebar if not already added
    if (!document.querySelector('#friends-sidebar-style')) {
        const style = document.createElement('style');
        style.id = 'friends-sidebar-style';
        style.textContent = `
            .friends-sidebar {
                position: fixed;
                bottom: 0;
                right: 20px;
                width: 280px;
                background-color: rgba(13, 13, 25, 0.95);
                border-radius: 8px 8px 0 0;
                box-shadow: 0 0 15px rgba(126, 34, 206, 0.5);
                border: 1px solid rgba(126, 34, 206, 0.5);
                border-bottom: none;
                z-index: 9999;
                transition: transform 0.3s ease;
            }
            
            .friends-sidebar.collapsed {
                transform: translateY(calc(100% - 40px));
            }
            
            .friends-header {
                padding: 10px 15px;
                background-color: rgba(126, 34, 206, 0.4);
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
            }
            
            .friends-header h3 {
                margin: 0;
                color: #fff;
                font-size: 1rem;
                font-weight: 600;
            }
            
            .friends-toggle {
                background: none;
                border: none;
                color: #fff;
                cursor: pointer;
            }
            
            .friend-request-badge {
                background-color: #ef4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                font-weight: bold;
                margin-left: auto;
                margin-right: 10px;
            }
            
            .friends-tabs {
                display: flex;
                padding: 10px 10px 0;
                border-bottom: 1px solid rgba(126, 34, 206, 0.3);
            }
            
            .friends-tab {
                flex: 1;
                background: none;
                border: none;
                color: white;
                padding: 8px;
                cursor: pointer;
                opacity: 0.7;
                border-bottom: 2px solid transparent;
            }
            
            .friends-tab.active {
                opacity: 1;
                border-bottom: 2px solid rgba(126, 34, 206, 0.7);
            }
            
            .request-count {
                background-color: #ef4444;
                color: white;
                border-radius: 50%;
                padding: 0 5px;
                font-size: 0.7rem;
                margin-left: 5px;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .friends-list-container {
                max-height: 350px;
                overflow: hidden;
            }
            
            .friends-search {
                padding: 10px;
                border-bottom: 1px solid rgba(126, 34, 206, 0.3);
                position: relative;
            }
            
            .friends-search input {
                width: 100%;
                padding: 8px 30px 8px 10px;
                border-radius: 4px;
                border: 1px solid rgba(126, 34, 206, 0.3);
                background-color: rgba(13, 13, 25, 0.7);
                color: #fff;
            }
            
            .friends-search i {
                position: absolute;
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
                color: rgba(255, 255, 255, 0.5);
            }
            
            .friends-list-wrapper {
                overflow-y: auto;
                max-height: 300px;
                padding: 10px;
            }
            
            .loading-message {
                text-align: center;
                color: rgba(255, 255, 255, 0.7);
                padding: 30px 0;
                font-size: 0.9rem;
            }
            
            .loading-message i {
                color: rgba(126, 34, 206, 0.7);
                font-size: 1.5rem;
                margin-bottom: 10px;
            }
            
            .empty-friends-message {
                text-align: center;
                color: rgba(255, 255, 255, 0.7);
                padding: 30px 0;
                font-size: 0.9rem;
            }
            
            .empty-friends-message i {
                color: rgba(126, 34, 206, 0.7);
                font-size: 1.5rem;
                margin-bottom: 10px;
            }
            
            .friend-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 5px;
                background-color: rgba(15, 15, 25, 0.7);
                transition: background-color 0.2s, transform 0.2s;
                cursor: pointer;
                border: 1px solid transparent;
            }
            
            .friend-item:hover {
                background-color: rgba(126, 34, 206, 0.1);
                border-color: rgba(126, 34, 206, 0.3);
                transform: translateY(-2px);
            }
            
            .friend-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: rgba(126, 34, 206, 0.3);
                margin-right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                font-weight: bold;
                color: white;
                overflow: hidden;
            }
            
            .friend-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .friend-info {
                flex: 1;
            }
            
            .friend-name {
                color: #fff;
                font-size: 0.9rem;
                margin-bottom: 3px;
            }
            
            .friend-status {
                font-size: 0.7rem;
                color: #718093;
            }
            
            .friend-status.online {
                color: #4cd137;
            }
            
            .friend-status.offline {
                color: #718093;
            }
            
            .friend-actions {
                display: flex;
                gap: 5px;
            }
            
            .friend-actions .btn {
                padding: 5px 10px;
                font-size: 0.8rem;
                white-space: nowrap;
            }
            
            .friend-action-btn {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                padding: 5px;
                font-size: 0.8rem;
                transition: color 0.2s;
            }
            
            .friend-action-btn:hover {
                color: rgba(255, 255, 255, 0.9);
            }
            
            /* Friend Request Styles */
            .request-item {
                display: flex;
                flex-direction: column;
                padding: 12px;
                margin-bottom: 8px;
                background-color: rgba(15, 15, 25, 0.7);
                border-radius: 4px;
                border: 1px solid rgba(126, 34, 206, 0.3);
                transition: all 0.3s ease;
            }
            
            .request-item:hover {
                background-color: rgba(126, 34, 206, 0.1);
                border-color: rgba(126, 34, 206, 0.5);
                transform: translateY(-2px);
            }
            
            .request-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .request-date {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.5);
                margin-top: 2px;
            }
            
            .request-message {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 10px;
                font-style: italic;
            }
            
            .request-actions {
                display: flex;
                gap: 8px;
            }
            
            .request-btn {
                flex: 1;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: 600;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .accept-btn {
                background-color: rgba(16, 185, 129, 0.6);
                color: white;
            }
            
            .accept-btn:hover {
                background-color: rgba(16, 185, 129, 0.9);
                transform: translateY(-1px);
            }
            
            .reject-btn {
                background-color: rgba(239, 68, 68, 0.6);
                color: white;
            }
            
            .reject-btn:hover {
                background-color: rgba(239, 68, 68, 0.9);
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize sidebar functionality
    const friendsHeader = friendsSidebar.querySelector('.friends-header');
    const toggleButton = friendsSidebar.querySelector('.friends-toggle');
    
    // Add click handler for the friend request badge
    const friendRequestBadge = friendsSidebar.querySelector('.friend-request-badge');
    if (friendRequestBadge) {
        friendRequestBadge.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent header click handler from being triggered
            
            // First, ensure the sidebar is expanded
            if (friendsSidebar.classList.contains('collapsed')) {
                friendsSidebar.classList.remove('collapsed');
                
                // Update toggle icon
                if (toggleButton) {
                    toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
                }
            }
            
            // Then select the requests tab
            selectRequestsTab();
        });
    }
    
    if (friendsHeader) {
        friendsHeader.addEventListener('click', function() {
            friendsSidebar.classList.toggle('collapsed');
            
            // Update toggle icon
            if (toggleButton) {
                if (friendsSidebar.classList.contains('collapsed')) {
                    toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
                } else {
                    toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
                }
            }
            
            // If expanding, refresh the data
            if (!friendsSidebar.classList.contains('collapsed')) {
                refreshFriendsList();
                refreshFriendRequests();
            }
        });
    }
    
    // Initialize tabs functionality
    const tabButtons = friendsSidebar.querySelectorAll('.friends-tab');
    if (tabButtons.length) {
        tabButtons.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                tabButtons.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Hide all tab contents
                const tabContents = friendsSidebar.querySelectorAll('.tab-content');
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Show the selected tab content
                const targetTab = this.dataset.tab;
                const targetContent = friendsSidebar.querySelector(`#${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // If requests tab is selected, refresh the requests
                if (targetTab === 'requests-list') {
                    console.log('Requests tab selected, refreshing requests');
                    refreshFriendRequests();
                    
                    // Force the tab content to be visible
                    const requestsList = document.getElementById('requests-list');
                    if (requestsList) {
                        requestsList.style.display = 'block';
                        requestsList.classList.add('active');
                    }
                } else if (targetTab === 'friends-list') {
                    refreshFriendsList();
                }
            });
        });
        
        // Add a special handler for the Requests tab
        const requestsTab = [...tabButtons].find(tab => tab.dataset.tab === 'requests-list');
        if (requestsTab) {
            const requestCountSpan = requestsTab.querySelector('.request-count');
            if (requestCountSpan) {
                // Make sure count is visible when there are requests
                if (requestCountSpan.textContent && requestCountSpan.textContent !== '') {
                    requestCountSpan.style.display = 'inline-flex';
                }
                
                // Add a more obvious hover effect
                requestsTab.style.position = 'relative';
                requestsTab.addEventListener('mouseenter', function() {
                    if (requestCountSpan.textContent && requestCountSpan.textContent !== '') {
                        requestsTab.style.backgroundColor = 'rgba(126, 34, 206, 0.2)';
                    }
                });
                requestsTab.addEventListener('mouseleave', function() {
                    requestsTab.style.backgroundColor = '';
                });
            }
        }
    }
    
    // Initialize search functionality
    const searchInput = friendsSidebar.querySelector('#friends-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterFriends(this.value.toLowerCase());
        });
    }
    
    // Initialize friends list if FriendsService is available
    if (window.FriendsService) {
        // Initial load of friends
        refreshFriendsList();
        
        // Load friend requests
        refreshFriendRequests();
        
        // Set up periodic check for new friend requests
        setInterval(async () => {
            if (!friendsSidebar.classList.contains('collapsed')) {
                await refreshFriendsList();
                await checkForNewFriendRequests();
            }
        }, 30000); // Check every 30 seconds
    } else {
        console.error('FriendsService not available');
        // Display error in friends list
        const friendsList = document.getElementById('friends-list');
        if (friendsList) {
            friendsList.innerHTML = `
                <div class="empty-friends-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Could not load friends service</p>
                </div>
            `;
        }
    }
}

// Filter friends in the sidebar
function filterFriends(searchTerm) {
    const friendItems = document.querySelectorAll('.friend-item');
    
    friendItems.forEach(item => {
        const friendName = item.querySelector('.friend-name').textContent.toLowerCase();
        
        if (friendName.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Display friends in the sidebar
function displayFriendsInSidebar(friends) {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;
    
    console.log('Displaying friends in sidebar:', friends);
    
    if (!friends || !Array.isArray(friends) || friends.length === 0) {
        friendsList.innerHTML = `
            <div class="empty-friends-message">
                <i class="fas fa-user-friends"></i>
                <p>No friends added yet</p>
            </div>
        `;
        return;
    }
    
    // Clear current list
    friendsList.innerHTML = '';
    
    // Process friends list - convert string IDs to objects if needed
    const processedFriends = friends.map(friend => {
        // Handle if friend is just an ID string
        if (typeof friend === 'string') {
            return { _id: friend, username: "User " + friend.substring(0, 5), status: 'offline' };
        }
        
        // Handle if friend is an object without username
        if (typeof friend === 'object' && !friend.username && friend._id) {
            return { ...friend, username: "User " + friend._id.substring(0, 5), status: 'offline' };
        }
        
        return friend;
    });
    
    // Add each friend to the list
    processedFriends.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        friendItem.dataset.id = friend._id || friend.id;
        
        // Default username if not provided
        const username = friend.username || 'Unknown User';
        
        // Determine status
        let status = 'offline';
        if (friend.status === 'online' || (friend.profile && friend.profile.status === 'online')) {
            status = 'online';
        }
        
        // Create initials for avatar if no avatar image
        const initials = getInitialsFromName(username);
        
        friendItem.innerHTML = `
            <div class="friend-avatar">${friend.avatar ? `<img src="${friend.avatar}" alt="${username}">` : initials}</div>
            <div class="friend-info">
                <div class="friend-name">${username}</div>
                <div class="friend-status ${status === 'online' ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i> ${status === 'online' ? 'Online' : 'Offline'}
                </div>
            </div>
            <div class="friend-actions">
                <button class="friend-action-btn invite-friend" title="Invite to lobby">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="friend-action-btn chat-with-friend" title="Chat">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        `;
        
        friendsList.appendChild(friendItem);
        
        // Add event listeners
        const inviteBtn = friendItem.querySelector('.invite-friend');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `pages/create-lobby.html?inviteFriend=${friend._id || friend.id}`;
            });
        }
        
        const chatBtn = friendItem.querySelector('.chat-with-friend');
        if (chatBtn) {
            chatBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                alert(`Chat with ${username} coming soon!`);
            });
        }
    });
    
    // Add a refresh button
    const refreshButton = document.createElement('div');
    refreshButton.className = 'friends-refresh-btn';
    refreshButton.innerHTML = `
        <button title="Refresh friends list">
            <i class="fas fa-sync-alt"></i> Refresh
        </button>
    `;
    friendsList.appendChild(refreshButton);
    
    // Add style for refresh button if not added yet
    if (!document.querySelector('#friends-refresh-style')) {
        const style = document.createElement('style');
        style.id = 'friends-refresh-style';
        style.textContent = `
            .friends-refresh-btn {
                text-align: center;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(126, 34, 206, 0.3);
            }
            
            .friends-refresh-btn button {
                background: rgba(126, 34, 206, 0.3);
                color: white;
                border: 1px solid rgba(126, 34, 206, 0.5);
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .friends-refresh-btn button:hover {
                background: rgba(126, 34, 206, 0.5);
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .friends-refresh-btn button i.spinning {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add refresh functionality
    const refreshBtn = refreshButton.querySelector('button');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const iconElement = refreshBtn.querySelector('i');
            iconElement.classList.add('spinning');
            refreshBtn.disabled = true;
            
            try {
                await refreshFriendsList();
                showNotification('Friends list updated', 'success', 2000);
            } catch (error) {
                console.error('Error refreshing friends:', error);
                showNotification('Could not refresh friends list', 'error', 3000);
            } finally {
                // Remove spinning class and re-enable button
                iconElement.classList.remove('spinning');
                refreshBtn.disabled = false;
            }
        });
    }
}

// New function to refresh the friends list
async function refreshFriendsList() {
    if (!window.FriendsService) {
        console.error('FriendsService not initialized');
        return;
    }
    
    try {
        // Force reload from the API
        await window.FriendsService.fetchFriendRequestsFromAPI();
        const freshFriends = await window.FriendsService.fetchFriendsFromAPI();
        console.log('Fresh friends loaded:', freshFriends);
        
        // Display the updated friends
        displayFriendsInSidebar(freshFriends);
        return freshFriends;
    } catch (error) {
        console.error('Error refreshing friends list:', error);
        throw error;
    }
}

// Get initials from name
function getInitialsFromName(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Refresh friend requests in the sidebar
async function refreshFriendRequests() {
    if (!window.FriendsService) return;
    
    try {
        console.log('Refreshing friend requests');
        
        // Get friend requests
        await window.FriendsService.fetchFriendRequestsFromAPI();
        const requests = window.FriendsService.getPendingRequests();
        
        console.log('Friend requests refreshed:', requests);
        
        // Display requests
        displayFriendRequestsInSidebar(requests);
        
        // Update request count badge
        updateFriendRequestBadge(requests);
        
        // If requests tab is selected, make sure it's displayed
        const requestsTab = document.querySelector('.friends-tab[data-tab="requests-list"]');
        if (requestsTab && requestsTab.classList.contains('active')) {
            const requestsList = document.getElementById('requests-list');
            if (requestsList) {
                requestsList.style.display = 'block';
                requestsList.classList.add('active');
            }
        }
        
        return requests;
    } catch (error) {
        console.error('Error refreshing friend requests:', error);
        return { sent: [], received: [] };
    }
}

// Function to programmatically select the Requests tab
function selectRequestsTab() {
    const requestsTab = document.querySelector('.friends-tab[data-tab="requests-list"]');
    if (requestsTab) {
        // Simulate a click on the tab
        requestsTab.click();
    }
}

// Check for new friend requests
async function checkForNewFriendRequests() {
    if (!window.FriendsService) return;
    
    try {
        const newRequests = await window.FriendsService.checkForNewRequests();
        if (newRequests && newRequests.length > 0) {
            // Update the UI
            displayFriendRequestsInSidebar(window.FriendsService.getPendingRequests());
            
            // Show notification for new requests
            showNotification(`You have ${newRequests.length} new friend request${newRequests.length > 1 ? 's' : ''}`, 'info');
            
            // Update request badge
            updateFriendRequestBadge(window.FriendsService.getPendingRequests());
        }
    } catch (error) {
        console.error('Error checking for new friend requests:', error);
    }
}

// Update friend request badge with count
function updateFriendRequestBadge(requests) {
    const receivedRequests = requests && requests.received ? requests.received.filter(req => req.status === 'pending') : [];
    const count = receivedRequests.length;
    
    console.log(`Updating friend request badge with count: ${count}`);
    
    // Update badge in header
    const badge = document.querySelector('.friend-request-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
        
        // Make badge more visible with animation if count > 0
        if (count > 0) {
            badge.classList.add('pulse');
            setTimeout(() => badge.classList.remove('pulse'), 1000);
        }
    }
    
    // Update count in tab
    const requestCountSpan = document.querySelector('.request-count');
    if (requestCountSpan) {
        requestCountSpan.textContent = count > 0 ? count : '';
        requestCountSpan.style.display = count > 0 ? 'inline-flex' : 'none';
        
        // Add highlight to the tab button if there are requests
        const requestsTab = document.querySelector('.friends-tab[data-tab="requests-list"]');
        if (requestsTab && count > 0) {
            // Add subtle glow effect to the tab
            requestsTab.style.textShadow = '0 0 8px rgba(239, 68, 68, 0.7)';
            requestsTab.style.fontWeight = 'bold';
        } else if (requestsTab) {
            requestsTab.style.textShadow = '';
            requestsTab.style.fontWeight = '';
        }
    }
    
    // If there are requests, add pulse animation style
    if (count > 0 && !document.querySelector('#friend-request-badge-animation')) {
        const style = document.createElement('style');
        style.id = 'friend-request-badge-animation';
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .pulse {
                animation: pulse 0.5s ease-in-out 2;
            }
            
            .request-count {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background-color: #ef4444;
                color: white;
                border-radius: 50%;
                min-width: 18px;
                height: 18px;
                font-size: 0.7rem;
                font-weight: bold;
                margin-left: 5px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Display friend requests in the sidebar
function displayFriendRequestsInSidebar(requests) {
    const requestsList = document.getElementById('requests-list');
    if (!requestsList) return;
    
    const receivedRequests = requests && requests.received ? requests.received.filter(req => req.status === 'pending') : [];
    
    if (receivedRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-friends-message">
                <i class="fas fa-user-plus"></i>
                <p>No friend requests</p>
            </div>
        `;
        return;
    }
    
    // Clear current list
    requestsList.innerHTML = '';
    
    // Add each request to the list
    receivedRequests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';
        requestItem.dataset.id = request._id;
        
        // Get sender info
        const senderName = request.sender && request.sender.username ? request.sender.username : 'Someone';
        const initials = getInitialsFromName(senderName);
        
        requestItem.innerHTML = `
            <div class="request-header">
                <div class="friend-avatar">${initials}</div>
                <div class="friend-info">
                    <div class="friend-name">${senderName}</div>
                    <div class="request-date">Sent ${formatRequestDate(request.createdAt)}</div>
                </div>
            </div>
            <div class="request-message">
                ${request.message || `${senderName} wants to be your friend!`}
            </div>
            <div class="request-actions">
                <button class="request-btn accept-btn" data-request-id="${request._id}">Accept</button>
                <button class="request-btn reject-btn" data-request-id="${request._id}">Reject</button>
            </div>
        `;
        
        requestsList.appendChild(requestItem);
        
        // Add event listeners
        const acceptBtn = requestItem.querySelector('.accept-btn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const requestId = acceptBtn.dataset.requestId;
                
                try {
                    // Show loading state
                    acceptBtn.disabled = true;
                    acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    // Accept the request
                    if (window.FriendsService) {
                        await window.FriendsService.acceptFriendRequest(requestId);
                        
                        // Show success notification
                        showNotification(`You are now friends with ${senderName}!`, 'success');
                        
                        // Refresh the friends and requests lists
                        window.FriendsService.loadFriends()
                            .then(friends => {
                                displayFriendsInSidebar(friends);
                            });
                        refreshFriendRequests();
                    }
                } catch (error) {
                    console.error('Error accepting friend request:', error);
                    showNotification('Could not accept friend request', 'error');
                    
                    // Reset button
                    acceptBtn.disabled = false;
                    acceptBtn.textContent = 'Accept';
                }
            });
        }
        
        const rejectBtn = requestItem.querySelector('.reject-btn');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const requestId = rejectBtn.dataset.requestId;
                
                try {
                    // Show loading state
                    rejectBtn.disabled = true;
                    rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    // Reject the request via API
                    const token = localStorage.getItem('token');
                    if (token) {
                        const apiUrl = window.APP_CONFIG?.API_URL || '/api';
                        const response = await fetch(`${apiUrl}/friends/reject/${requestId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (response.ok) {
                            // Show success notification
                            showNotification('Friend request rejected', 'info');
                            
                            // Refresh requests list
                            refreshFriendRequests();
                        } else {
                            throw new Error('Failed to reject request');
                        }
                    }
                } catch (error) {
                    console.error('Error rejecting friend request:', error);
                    showNotification('Could not reject friend request', 'error');
                    
                    // Reset button
                    rejectBtn.disabled = false;
                    rejectBtn.textContent = 'Reject';
                }
            });
        }
    });
}

// Format date for request display
function formatRequestDate(dateString) {
    if (!dateString) return 'recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (isNaN(diffDays)) return 'recently';
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
        }
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
        return 'yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
} 