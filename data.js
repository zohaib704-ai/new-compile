// Simulated database for CodeMaster
class DataStore {
    constructor() {
        // Initialize data from localStorage or use defaults
        this.init();
    }
    
    init() {
        // Initialize blogs
        if (!localStorage.getItem('codemaster_blogs')) {
            const defaultBlogs = [
                {
                    id: '1',
                    title: 'Getting Started with JavaScript',
                    author: 'Admin',
                    date: '2024-01-15',
                    content: 'JavaScript is one of the most popular programming languages for web development. In this guide, we\'ll cover the basics of JavaScript including variables, functions, and control structures.',
                    image: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    category: 'Programming',
                    tags: ['javascript', 'beginner', 'web']
                },
                {
                    id: '2',
                    title: 'Python for Data Science',
                    author: 'Admin',
                    date: '2024-01-10',
                    content: 'Python has become the go-to language for data science and machine learning. Learn about libraries like NumPy, Pandas, and Matplotlib for data analysis.',
                    image: 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    category: 'Data Science',
                    tags: ['python', 'data-science', 'ml']
                },
                {
                    id: '3',
                    title: 'Web Development Trends 2024',
                    author: 'Admin',
                    date: '2024-01-05',
                    content: 'Explore the latest trends in web development including AI-powered tools, new frameworks, and performance optimization techniques.',
                    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    category: 'Web Development',
                    tags: ['web', 'trends', '2024']
                }
            ];
            localStorage.setItem('codemaster_blogs', JSON.stringify(defaultBlogs));
        }
        
        // Initialize admin settings
        if (!localStorage.getItem('codemaster_admin')) {
            const adminSettings = {
                users: [
                    {
                        id: '1',
                        username: 'admin',
                        // Password: "admin123" encrypted with simple hash
                        password: 'd033e22ae348aeb5660fc2140aec35850c4da997', // sha1 of "admin123"
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    }
                ],
                settings: {
                    siteTitle: 'CodeMaster',
                    siteDescription: 'Online Compiler and Language Converter',
                    contactEmail: 'contact@codemaster.dev',
                    maintenanceMode: false
                }
            };
            localStorage.setItem('codemaster_admin', JSON.stringify(adminSettings));
        }
        
        // Initialize compiler history
        if (!localStorage.getItem('codemaster_history')) {
            localStorage.setItem('codemaster_history', JSON.stringify([]));
        }
    }
    
    // Blog operations
    getBlogs() {
        const blogs = JSON.parse(localStorage.getItem('codemaster_blogs') || '[]');
        return blogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    getBlog(id) {
        const blogs = this.getBlogs();
        return blogs.find(blog => blog.id === id);
    }
    
    addBlog(blog) {
        const blogs = this.getBlogs();
        blog.id = Date.now().toString();
        blog.date = new Date().toISOString().split('T')[0];
        blogs.unshift(blog);
        localStorage.setItem('codemaster_blogs', JSON.stringify(blogs));
        return blog;
    }
    
    updateBlog(id, updatedBlog) {
        const blogs = this.getBlogs();
        const index = blogs.findIndex(blog => blog.id === id);
        if (index !== -1) {
            blogs[index] = { ...blogs[index], ...updatedBlog, id };
            localStorage.setItem('codemaster_blogs', JSON.stringify(blogs));
            return blogs[index];
        }
        return null;
    }
    
    deleteBlog(id) {
        const blogs = this.getBlogs();
        const filteredBlogs = blogs.filter(blog => blog.id !== id);
        localStorage.setItem('codemaster_blogs', JSON.stringify(filteredBlogs));
        return true;
    }
    
    // Admin operations
    authenticate(username, password) {
        const data = JSON.parse(localStorage.getItem('codemaster_admin'));
        const user = data.users.find(u => u.username === username);
        
        if (!user) return false;
        
        // Simple SHA-1 hash check (in production, use bcrypt)
        const sha1 = (str) => {
            try {
                // Simple hash for demo purposes
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return hash.toString(16);
            } catch {
                // Fallback simple hash
                return str.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0).toString(16);
            }
        };
        
        return user.password === sha1(password);
    }
    
    isAdminAuthenticated() {
        return sessionStorage.getItem('admin_logged_in') === 'true';
    }
    
    setAdminSession(authenticated) {
        if (authenticated) {
            sessionStorage.setItem('admin_logged_in', 'true');
        } else {
            sessionStorage.removeItem('admin_logged_in');
        }
    }
    
    // Compiler history
    addHistory(entry) {
        const history = JSON.parse(localStorage.getItem('codemaster_history') || '[]');
        history.unshift({
            ...entry,
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        });
        
        // Keep only last 100 entries
        if (history.length > 100) {
            history.length = 100;
        }
        
        localStorage.setItem('codemaster_history', JSON.stringify(history));
    }
    
    getHistory() {
        return JSON.parse(localStorage.getItem('codemaster_history') || '[]');
    }
    
    clearHistory() {
        localStorage.setItem('codemaster_history', JSON.stringify([]));
    }
}

// Create global data store instance
const dataStore = new DataStore();
window.dataStore = dataStore;