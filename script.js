// Main JavaScript for CodeMaster
class CodeMasterApp {
    constructor() {
        this.dataStore = window.dataStore;
        this.init();
    }
    
    init() {
        this.initTheme();
        this.initMobileMenu();
        this.initAdminCheck();
        this.initHighlight();
        this.loadLatestBlogs();
        this.initAdminAccess();
    }
    
    initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('codemaster_theme');
        
        // Set initial theme
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else if (savedTheme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // Toggle theme
        themeToggle?.addEventListener('click', () => {
            if (document.body.classList.contains('dark-theme')) {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('codemaster_theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.body.classList.add('dark-theme');
                localStorage.setItem('codemaster_theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        });
    }
    
    initMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        hamburger?.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks?.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger?.contains(e.target) && !navLinks?.contains(e.target)) {
                hamburger?.classList.remove('active');
                navLinks?.classList.remove('active');
            }
        });
        
        // Close menu when clicking links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger?.classList.remove('active');
                navLinks?.classList.remove('active');
            });
        });
    }
    
    initAdminCheck() {
        // Check if admin is logged in
        const isAdmin = this.dataStore.isAdminAuthenticated();
        const adminElements = document.querySelectorAll('.admin-only');
        
        adminElements.forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
        });
    }
    
    initHighlight() {
        // Initialize syntax highlighting
        if (typeof hljs !== 'undefined') {
            hljs.highlightAll();
        }
    }
    
    async loadLatestBlogs() {
        const blogsContainer = document.getElementById('latestBlogs');
        if (!blogsContainer) return;
        
        const blogs = this.dataStore.getBlogs().slice(0, 3);
        
        if (blogs.length === 0) {
            blogsContainer.innerHTML = `
                <div class="no-blogs">
                    <i class="fas fa-newspaper"></i>
                    <h3>No blog posts yet</h3>
                    <p>Check back soon for updates!</p>
                </div>
            `;
            return;
        }
        
        blogsContainer.innerHTML = blogs.map(blog => `
            <div class="blog-card">
                <div class="blog-image">
                    <img src="${blog.image}" alt="${blog.title}" onerror="this.src='https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                </div>
                <div class="blog-content">
                    <span class="blog-category">${blog.category}</span>
                    <h3>${blog.title}</h3>
                    <div class="blog-meta">
                        <span><i class="fas fa-user"></i> ${blog.author}</span>
                        <span><i class="fas fa-calendar"></i> ${blog.date}</span>
                    </div>
                    <p>${blog.content.substring(0, 100)}...</p>
                    <a href="blog.html#blog-${blog.id}" class="btn btn-outline">
                        Read More <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `).join('');
        
        // Add blog styles if not already added
        if (!document.querySelector('#blog-styles')) {
            const style = document.createElement('style');
            style.id = 'blog-styles';
            style.textContent = `
                .blog-card {
                    background-color: var(--card-bg);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                    transition: transform 0.3s;
                }
                
                .blog-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--primary-color);
                }
                
                .blog-image {
                    height: 200px;
                    overflow: hidden;
                }
                
                .blog-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s;
                }
                
                .blog-card:hover .blog-image img {
                    transform: scale(1.05);
                }
                
                .blog-content {
                    padding: 1.5rem;
                }
                
                .blog-category {
                    display: inline-block;
                    background-color: var(--primary-color);
                    color: white;
                    padding: 0.3rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    margin-bottom: 1rem;
                }
                
                .blog-content h3 {
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                    font-size: 1.2rem;
                }
                
                .blog-meta {
                    display: flex;
                    gap: 1rem;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                }
                
                .blog-meta span {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                }
                
                .blog-content p {
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                    line-height: 1.6;
                }
                
                .no-blogs {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                    background-color: var(--card-bg);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                
                .no-blogs i {
                    font-size: 3rem;
                    color: var(--primary-color);
                    margin-bottom: 1rem;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    initAdminAccess() {
        // Add keyboard shortcut for admin access
        let keySequence = '';
        const adminKey = '1337'; // Secret code for admin access
        
        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') {
                keySequence += e.key;
                
                // Check if sequence matches admin key
                if (keySequence === adminKey) {
                    this.showAdminLogin();
                    keySequence = '';
                }
                
                // Reset if sequence gets too long
                if (keySequence.length > 4) {
                    keySequence = '';
                }
            }
        });
    }
    
    showAdminLogin() {
        // Create admin login modal
        const modal = document.createElement('div');
        modal.className = 'admin-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3><i class="fas fa-user-shield"></i> Admin Access</h3>
                <form id="adminAccessForm">
                    <div class="form-group">
                        <label for="adminUsername">Username</label>
                        <input type="text" id="adminUsername" required>
                    </div>
                    <div class="form-group">
                        <label for="adminPassword">Password</label>
                        <input type="password" id="adminPassword" required>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                        <button type="button" class="btn btn-secondary close-modal">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .admin-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            }
            
            .admin-modal .modal-content {
                background-color: var(--card-bg);
                padding: 2rem;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                border: 1px solid var(--border-color);
            }
            
            .admin-modal h3 {
                color: var(--text-primary);
                margin-bottom: 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .form-group {
                margin-bottom: 1rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: var(--text-primary);
            }
            
            .form-group input {
                width: 100%;
                padding: 0.8rem;
                background-color: var(--dark-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                color: var(--text-primary);
            }
            
            .modal-actions {
                display: flex;
                gap: 1rem;
                margin-top: 1.5rem;
            }
        `;
        modal.appendChild(style);
        
        // Handle form submission
        modal.querySelector('#adminAccessForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = modal.querySelector('#adminUsername').value;
            const password = modal.querySelector('#adminPassword').value;
            
            if (this.dataStore.authenticate(username, password)) {
                this.dataStore.setAdminSession(true);
                this.showNotification('Admin access granted!', 'success');
                this.initAdminCheck();
                modal.remove();
                document.body.style.overflow = 'auto';
                
                // Redirect to admin page after 1 second
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
            } else {
                this.showNotification('Invalid credentials!', 'error');
            }
        });
        
        // Close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: var(--border-radius);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    max-width: 400px;
                    z-index: 10000;
                    animation: slideIn 0.3s ease-out;
                    box-shadow: var(--box-shadow);
                    border-left: 4px solid;
                }
                
                .notification-success {
                    background-color: rgba(16, 185, 129, 0.1);
                    color: var(--success);
                    border-left-color: var(--success);
                }
                
                .notification-error {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: var(--danger);
                    border-left-color: var(--danger);
                }
                
                .notification-info {
                    background-color: rgba(59, 130, 246, 0.1);
                    color: var(--info);
                    border-left-color: var(--info);
                }
                
                .notification-warning {
                    background-color: rgba(245, 158, 11, 0.1);
                    color: var(--warning);
                    border-left-color: var(--warning);
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.7;
                    transition: opacity 0.3s;
                }
                
                .notification-close:hover {
                    opacity: 1;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add close button event
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        document.body.appendChild(notification);
    }
    
    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    truncateText(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CodeMasterApp();
});