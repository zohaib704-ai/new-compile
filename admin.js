// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentBlog = null;
        this.init();
    }
    
    init() {
        this.checkAuth();
        this.initEventListeners();
        this.loadBlogs();
        this.initDashboard();
    }
    
    checkAuth() {
        const isAdmin = window.dataStore?.isAdminAuthenticated();
        
        if (!isAdmin) {
            // Redirect to login if not authenticated
            this.showLogin();
            return false;
        }
        
        // Show admin interface
        document.querySelector('.admin-dashboard').style.display = 'block';
        document.querySelector('.admin-login').style.display = 'none';
        return true;
    }
    
    showLogin() {
        const loginForm = document.getElementById('adminLoginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                if (window.dataStore.authenticate(username, password)) {
                    window.dataStore.setAdminSession(true);
                    window.location.reload();
                } else {
                    alert('Invalid credentials! Try: admin / admin123');
                }
            });
        }
    }
    
    initEventListeners() {
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            window.dataStore.setAdminSession(false);
            window.location.href = 'index.html';
        });
        
        // Tab switching
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Show corresponding content
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(`${tabId}Tab`).classList.add('active');
            });
        });
        
        // Blog management
        document.getElementById('newBlogBtn')?.addEventListener('click', () => this.showBlogEditor());
        document.getElementById('cancelEdit')?.addEventListener('click', () => this.hideBlogEditor());
        document.getElementById('deleteBlog')?.addEventListener('click', () => this.deleteCurrentBlog());
        
        // Blog form submission
        document.getElementById('blogForm')?.addEventListener('submit', (e) => this.saveBlogPost(e));
        
        // Settings forms
        document.getElementById('addUserForm')?.addEventListener('submit', (e) => this.addUser(e));
        document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => this.changePassword(e));
        
        // Theme settings
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                const theme = this.getAttribute('data-theme');
                localStorage.setItem('codemaster_admin_theme', theme);
                window.app?.showNotification(`Theme changed to ${theme}`, 'success');
            });
        });
    }
    
    showBlogEditor(blog = null) {
        const editor = document.getElementById('blogEditor');
        const list = document.getElementById('blogList');
        const deleteBtn = document.getElementById('deleteBlog');
        
        editor.style.display = 'block';
        list.style.display = 'none';
        
        if (blog) {
            // Edit existing blog
            this.currentBlog = blog;
            document.getElementById('blogId').value = blog.id;
            document.getElementById('blogTitle').value = blog.title;
            document.getElementById('blogAuthor').value = blog.author;
            document.getElementById('blogContent').value = blog.content;
            document.getElementById('blogCategory').value = blog.category || 'Programming';
            document.getElementById('blogTags').value = blog.tags?.join(', ') || '';
            deleteBtn.style.display = 'inline-block';
        } else {
            // Create new blog
            this.currentBlog = null;
            document.getElementById('blogId').value = '';
            document.getElementById('blogTitle').value = '';
            document.getElementById('blogAuthor').value = 'Admin';
            document.getElementById('blogContent').value = '';
            document.getElementById('blogCategory').value = 'Programming';
            document.getElementById('blogTags').value = '';
            deleteBtn.style.display = 'none';
        }
    }
    
    hideBlogEditor() {
        document.getElementById('blogEditor').style.display = 'none';
        document.getElementById('blogList').style.display = 'block';
        this.currentBlog = null;
        document.getElementById('blogForm').reset();
    }
    
    loadBlogs() {
        const blogs = window.dataStore.getBlogs();
        this.displayBlogs(blogs);
    }
    
    displayBlogs(blogs) {
        const tableBody = document.getElementById('blogTableBody');
        
        if (!tableBody) return;
        
        if (blogs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <i class="fas fa-newspaper"></i>
                        <p>No blog posts yet. Create your first post!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = blogs.map(blog => `
            <tr>
                <td>${blog.title}</td>
                <td>${blog.author}</td>
                <td>${blog.date}</td>
                <td>${blog.category || 'General'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="admin.editBlog('${blog.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="admin.confirmDeleteBlog('${blog.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    editBlog(blogId) {
        const blog = window.dataStore.getBlog(blogId);
        if (blog) {
            this.showBlogEditor(blog);
        }
    }
    
    confirmDeleteBlog(blogId) {
        if (confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
            this.deleteBlog(blogId);
        }
    }
    
    deleteBlog(blogId) {
        const success = window.dataStore.deleteBlog(blogId);
        if (success) {
            this.loadBlogs();
            if (this.currentBlog && this.currentBlog.id === blogId) {
                this.hideBlogEditor();
            }
            window.app?.showNotification('Blog post deleted successfully!', 'success');
        } else {
            window.app?.showNotification('Failed to delete blog post', 'error');
        }
    }
    
    deleteCurrentBlog() {
        if (this.currentBlog) {
            this.confirmDeleteBlog(this.currentBlog.id);
        }
    }
    
    saveBlogPost(event) {
        event.preventDefault();
        
        const form = event.target;
        const blogId = document.getElementById('blogId').value;
        
        const blogData = {
            title: document.getElementById('blogTitle').value,
            author: document.getElementById('blogAuthor').value,
            content: document.getElementById('blogContent').value,
            category: document.getElementById('blogCategory').value,
            tags: document.getElementById('blogTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        };
        
        // Validate
        if (!blogData.title.trim() || !blogData.content.trim()) {
            window.app?.showNotification('Please fill in all required fields!', 'error');
            return;
        }
        
        let blog;
        if (blogId) {
            // Update existing blog
            blog = window.dataStore.updateBlog(blogId, blogData);
            window.app?.showNotification('Blog post updated successfully!', 'success');
        } else {
            // Create new blog
            blog = window.dataStore.addBlog(blogData);
            window.app?.showNotification('Blog post created successfully!', 'success');
        }
        
        this.loadBlogs();
        this.hideBlogEditor();
    }
    
    addUser(event) {
        event.preventDefault();
        window.app?.showNotification('User management would be implemented in production', 'info');
        // In production, implement user management
    }
    
    changePassword(event) {
        event.preventDefault();
        window.app?.showNotification('Password changed successfully!', 'success');
        // In production, implement password change logic
    }
    
    initDashboard() {
        // Load stats
        this.loadStats();
        
        // Initialize charts if available
        if (typeof Chart !== 'undefined') {
            this.initCharts();
        }
    }
    
    loadStats() {
        const blogs = window.dataStore.getBlogs();
        const history = window.dataStore.getHistory();
        
        // Update stats cards
        document.querySelectorAll('.stat-card-large').forEach(card => {
            const title = card.querySelector('h3')?.textContent;
            if (title === 'Blog Posts') {
                card.querySelector('h3').textContent = blogs.length;
            } else if (title === 'Compilations') {
                const compilations = history.filter(h => h.type === 'compile').length;
                card.querySelector('h3').textContent = compilations;
            } else if (title === 'Conversions') {
                const conversions = history.filter(h => h.type === 'convert').length;
                card.querySelector('h3').textContent = conversions;
            }
        });
    }
    
    initCharts() {
        const history = window.dataStore.getHistory();
        
        // Language usage chart
        const langCtx = document.getElementById('languagesChart');
        if (langCtx) {
            const languages = {};
            history.forEach(entry => {
                if (entry.type === 'compile') {
                    languages[entry.language] = (languages[entry.language] || 0) + 1;
                }
            });
            
            new Chart(langCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(languages),
                    datasets: [{
                        data: Object.values(languages),
                        backgroundColor: [
                            '#f7df1e', '#3776ab', '#f89820', '#00599c',
                            '#9b4993', '#00add8', '#000000', '#777bb4',
                            '#f05138', '#6366f1'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'var(--text-primary)',
                                padding: 20
                            }
                        }
                    }
                }
            });
        }
        
        // Activity chart
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            // Last 7 days activity
            const days = [];
            const data = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
                days.push(dateStr);
                
                // Count activities for this day
                const dayStart = new Date(date.setHours(0, 0, 0, 0));
                const dayEnd = new Date(date.setHours(23, 59, 59, 999));
                
                const dayActivities = history.filter(h => {
                    const activityDate = new Date(h.timestamp);
                    return activityDate >= dayStart && activityDate <= dayEnd;
                }).length;
                
                data.push(dayActivities);
            }
            
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Daily Activities',
                        data: data,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'var(--text-primary)'
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'var(--border-color)'
                            },
                            ticks: {
                                color: 'var(--text-secondary)'
                            }
                        },
                        y: {
                            grid: {
                                color: 'var(--border-color)'
                            },
                            ticks: {
                                color: 'var(--text-secondary)'
                            }
                        }
                    }
                }
            });
        }
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminPanel();
});