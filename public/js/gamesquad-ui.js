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