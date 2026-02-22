// server.js - CodeMaster Backend Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'codemaster-secret-key-2026';
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error('Error creating data directory:', err);
    }
}
ensureDataDir();

// ==================== Data File Paths ====================
const DATA_FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    blogs: path.join(DATA_DIR, 'blogs.json'),
    analytics: path.join(DATA_DIR, 'analytics.json'),
    codeHistory: path.join(DATA_DIR, 'code-history.json'),
    settings: path.join(DATA_DIR, 'settings.json')
};

// ==================== Initialize Data Files ====================
async function initializeDataFiles() {
    for (const [key, filePath] of Object.entries(DATA_FILES)) {
        try {
            await fs.access(filePath);
        } catch (err) {
            // File doesn't exist, create with default data
            let defaultData = [];
            
            if (key === 'users') {
                // Create default admin user
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('admin123', salt);
                defaultData = [{
                    id: 1,
                    username: 'admin',
                    email: 'admin@codemaster.com',
                    password: hashedPassword,
                    role: 'super_admin',
                    createdAt: new Date().toISOString(),
                    lastLogin: null
                }];
            } else if (key === 'blogs') {
                defaultData = [
                    {
                        id: 1,
                        title: 'Getting Started with JavaScript',
                        author: 'Sarah Johnson',
                        content: `# Getting Started with JavaScript

JavaScript is one of the most popular programming languages for web development. In this guide, we'll cover the basics to get you started.

## What is JavaScript?
JavaScript is a lightweight, interpreted programming language that enables interactive web pages. It's an essential part of web applications alongside HTML and CSS.

## Basic Syntax
\`\`\`javascript
// This is a comment
console.log("Hello, World!");

// Variables
let name = "John";
const age = 30;
var oldWay = "Avoid using var";

// Functions
function greet(person) {
    return \`Hello, \${person}!\`;
}

console.log(greet(name));
\`\`\`

## Key Concepts
- Variables and Data Types
- Functions and Scope
- DOM Manipulation
- Events and Event Handlers
- Asynchronous Programming

Stay tuned for more advanced topics!`,
                        excerpt: 'JavaScript is one of the most popular programming languages for web development. In this guide, we\'ll cover the basics to get you started.',
                        category: 'Programming',
                        tags: ['javascript', 'web development', 'beginner'],
                        image: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                        icon: 'fab fa-js',
                        readTime: 5,
                        views: 1245,
                        likes: 87,
                        createdAt: '2026-02-20T10:00:00Z',
                        updatedAt: '2026-02-20T10:00:00Z',
                        published: true
                    },
                    {
                        id: 2,
                        title: 'Python for Data Science',
                        author: 'Dr. Emily Brown',
                        content: `# Python for Data Science

Python has become the go-to language for data science and machine learning. Learn about essential libraries and techniques.

## Why Python for Data Science?
- Easy to learn and read
- Extensive library ecosystem
- Strong community support
- Excellent for prototyping

## Essential Libraries
\`\`\`python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn import datasets

# Load sample dataset
iris = datasets.load_iris()
df = pd.DataFrame(iris.data, columns=iris.feature_names)

# Basic analysis
print(df.head())
print(df.describe())

# Simple visualization
plt.scatter(df.iloc[:, 0], df.iloc[:, 1])
plt.show()
\`\`\`

## Popular Libraries
1. **NumPy** - Numerical computing
2. **Pandas** - Data manipulation
3. **Matplotlib** - Data visualization
4. **Scikit-learn** - Machine learning
5. **TensorFlow/PyTorch** - Deep learning

## Getting Started
Start with NumPy and Pandas, then move on to visualization and machine learning.`,
                        excerpt: 'Python has become the go-to language for data science and machine learning. Learn about essential libraries and techniques.',
                        category: 'AI/ML',
                        tags: ['python', 'data science', 'machine learning'],
                        image: 'https://images.unsplash.com/photo-1526379095098-400a3eaeac5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                        icon: 'fab fa-python',
                        readTime: 7,
                        views: 2341,
                        likes: 156,
                        createdAt: '2026-02-18T14:30:00Z',
                        updatedAt: '2026-02-18T14:30:00Z',
                        published: true
                    }
                ];
            } else if (key === 'analytics') {
                defaultData = {
                    pageViews: {},
                    visits: [],
                    languageUsage: {},
                    conversionStats: {}
                };
            } else if (key === 'codeHistory') {
                defaultData = [];
            } else if (key === 'settings') {
                defaultData = {
                    siteName: 'CodeMaster',
                    siteDescription: 'Code, Compile & Convert Instantly',
                    allowRegistration: false,
                    defaultTheme: 'dark',
                    enableAnalytics: true,
                    maintenanceMode: false
                };
            }
            
            await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
            console.log(`Created ${key} data file`);
        }
    }
}
initializeDataFiles();

// ==================== Helper Functions ====================
async function readData(file) {
    try {
        const data = await fs.readFile(DATA_FILES[file], 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${file}:`, err);
        return null;
    }
}

async function writeData(file, data) {
    try {
        await fs.writeFile(DATA_FILES[file], JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error(`Error writing ${file}:`, err);
        return false;
    }
}

// ==================== Authentication Middleware ====================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
}

// ==================== API Routes ====================

// ---------- Authentication Routes ----------
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const users = await readData('users');
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        await writeData('users', users);
        
        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ---------- Blog Routes ----------
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await readData('blogs');
        const { category, tag, limit, published } = req.query;
        
        let filtered = [...blogs];
        
        // Filter by published status (default to only published for public)
        if (published === 'true' || published === undefined) {
            filtered = filtered.filter(b => b.published !== false);
        }
        
        // Filter by category
        if (category) {
            filtered = filtered.filter(b => b.category === category);
        }
        
        // Filter by tag
        if (tag) {
            filtered = filtered.filter(b => b.tags && b.tags.includes(tag));
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Apply limit
        if (limit) {
            filtered = filtered.slice(0, parseInt(limit));
        }
        
        res.json(filtered);
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blogs = await readData('blogs');
        const blog = blogs.find(b => b.id == req.params.id);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        // Increment view count (track analytics)
        blog.views = (blog.views || 0) + 1;
        await writeData('blogs', blogs);
        
        // Track in analytics
        await trackPageView(`/blog/${blog.id}`);
        
        res.json(blog);
    } catch (err) {
        console.error('Error fetching blog:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Create blog
app.post('/api/admin/blogs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const blogs = await readData('blogs');
        
        const newBlog = {
            id: blogs.length > 0 ? Math.max(...blogs.map(b => b.id)) + 1 : 1,
            ...req.body,
            views: 0,
            likes: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        blogs.push(newBlog);
        await writeData('blogs', blogs);
        
        res.status(201).json(newBlog);
    } catch (err) {
        console.error('Error creating blog:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Update blog
app.put('/api/admin/blogs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const blogs = await readData('blogs');
        const index = blogs.findIndex(b => b.id == req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        blogs[index] = {
            ...blogs[index],
            ...req.body,
            id: blogs[index].id,
            updatedAt: new Date().toISOString()
        };
        
        await writeData('blogs', blogs);
        res.json(blogs[index]);
    } catch (err) {
        console.error('Error updating blog:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Delete blog
app.delete('/api/admin/blogs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const blogs = await readData('blogs');
        const filtered = blogs.filter(b => b.id != req.params.id);
        
        if (filtered.length === blogs.length) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        await writeData('blogs', filtered);
        res.json({ success: true, message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Code Execution Routes ----------
app.post('/api/execute', async (req, res) => {
    const { code, language, input } = req.body;
    
    if (!code || !language) {
        return res.status(400).json({ error: 'Code and language required' });
    }
    
    try {
        let output = '';
        let error = '';
        
        // For demo purposes, handle JavaScript execution
        if (language === 'javascript') {
            try {
                // Capture console.log output
                const logs = [];
                const customConsole = {
                    log: (...args) => {
                        logs.push(args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                        ).join(' '));
                    }
                };
                
                const func = new Function('console', code);
                func(customConsole);
                
                output = logs.join('\n');
            } catch (err) {
                error = err.message;
            }
        } 
        // For other languages, we'd need to use Docker or external APIs
        else {
            output = `Execution for ${language} would be handled by a backend service.\n\nIn production, this would:\n1. Create a secure sandbox\n2. Compile/run the code\n3. Return the output\n4. Clean up resources`;
        }
        
        // Track code execution in history
        await trackCodeExecution(language, 'success');
        
        res.json({ output, error, success: !error });
    } catch (err) {
        console.error('Execution error:', err);
        res.status(500).json({ error: 'Server error during code execution' });
    }
});

// ---------- Code Conversion Routes ----------
app.post('/api/convert', async (req, res) => {
    const { code, fromLang, toLang } = req.body;
    
    if (!code || !fromLang || !toLang) {
        return res.status(400).json({ error: 'Code, source language, and target language required' });
    }
    
    try {
        let converted = code;
        
        // Simple conversion rules (in production, use proper transpilers)
        if (fromLang === 'javascript' && toLang === 'python') {
            converted = convertJsToPython(code);
        } else if (fromLang === 'python' && toLang === 'javascript') {
            converted = convertPythonToJs(code);
        } else {
            converted = `// Conversion from ${fromLang} to ${toLang}\n// This is a demonstration\n// Full conversion would use proper transpilers\n\n${code}`;
        }
        
        // Track conversion in history
        await trackCodeExecution('conversion', 'success');
        
        res.json({ 
            converted,
            from: fromLang,
            to: toLang,
            success: true 
        });
    } catch (err) {
        console.error('Conversion error:', err);
        res.status(500).json({ error: 'Server error during code conversion' });
    }
});

// Helper functions for code conversion (simplified examples)
function convertJsToPython(jsCode) {
    return jsCode
        .replace(/\/\/.*/g, match => '# ' + match.slice(2))
        .replace(/console\.log\((.*)\);/g, 'print($1)')
        .replace(/function\s+(\w+)\s*\(([^)]*)\)/g, 'def $1($2):')
        .replace(/let\s+|const\s+/g, '')
        .replace(/===/g, '==')
        .replace(/!==/g, '!=')
        .replace(/{/g, ':')
        .replace(/}/g, '')
        .replace(/;/g, '');
}

function convertPythonToJs(pyCode) {
    return pyCode
        .replace(/#.*/g, match => '// ' + match.slice(1))
        .replace(/print\((.*)\)/g, 'console.log($1);')
        .replace(/def\s+(\w+)\s*\(([^)]*)\):/g, 'function $1($2) {')
        .replace(/elif/g, 'else if')
        .replace(/:/g, ' {')
        .replace(/^(\s+)return/g, '$1return');
}

// ---------- Analytics Routes ----------
async function trackPageView(page) {
    try {
        const analytics = await readData('analytics');
        
        // Track page view
        analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
        
        // Track visit
        analytics.visits.push({
            page,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 10000 visits
        if (analytics.visits.length > 10000) {
            analytics.visits = analytics.visits.slice(-10000);
        }
        
        await writeData('analytics', analytics);
    } catch (err) {
        console.error('Error tracking page view:', err);
    }
}

async function trackCodeExecution(type, status) {
    try {
        const history = await readData('codeHistory');
        
        history.push({
            type,
            status,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 entries
        if (history.length > 1000) {
            history.shift();
        }
        
        await writeData('codeHistory', history);
    } catch (err) {
        console.error('Error tracking code execution:', err);
    }
}

// Admin: Get analytics
app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const analytics = await readData('analytics');
        const blogs = await readData('blogs');
        const history = await readData('codeHistory');
        
        // Calculate statistics
        const totalPageViews = Object.values(analytics.pageViews || {}).reduce((a, b) => a + b, 0);
        
        // Last 7 days activity
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayVisits = analytics.visits.filter(v => 
                v.timestamp.startsWith(dateStr)
            ).length;
            
            last7Days.push({
                date: dateStr,
                visits: dayVisits
            });
        }
        
        // Language usage
        const languageUsage = {};
        history.forEach(h => {
            if (h.type === 'compile') {
                languageUsage[h.language] = (languageUsage[h.language] || 0) + 1;
            }
        });
        
        res.json({
            totalBlogs: blogs.length,
            totalPageViews,
            totalVisits: analytics.visits.length,
            totalExecutions: history.length,
            last7Days,
            languageUsage,
            pageViews: analytics.pageViews
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- User Management Routes (Admin Only) ----------
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await readData('users');
        // Remove passwords from response
        const safeUsers = users.map(({ password, ...user }) => user);
        res.json(safeUsers);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }
        
        const users = await readData('users');
        
        // Check if user exists
        if (users.some(u => u.username === username || u.email === email)) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            username,
            email,
            password: hashedPassword,
            role: role || 'editor',
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        users.push(newUser);
        await writeData('users', users);
        
        const { password: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await readData('users');
        
        // Prevent deleting yourself
        if (req.user.id == req.params.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        const filtered = users.filter(u => u.id != req.params.id);
        
        if (filtered.length === users.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await writeData('users', filtered);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ---------- Settings Routes (Admin Only) ----------
app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const settings = await readData('settings');
        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        await writeData('settings', settings);
        res.json({ success: true, settings });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== Serve Frontend ====================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== Start Server ====================
app.listen(PORT, () => {
    console.log(`🚀 CodeMaster server running on port ${PORT}`);
    console.log(`📝 API available at http://localhost:${PORT}/api`);
    console.log(`🔐 Admin login: admin / admin123`);
});

module.exports = app;
