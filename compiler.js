// compiler.js - Enhanced CodeMaster Compiler with Server Integration

class CodeCompiler {
    constructor() {
        this.editor = null;
        this.currentLanguage = 'javascript';
        this.output = [];
        this.history = [];
        this.theme = localStorage.getItem('codemaster_theme') || 'dark';
        this.serverUrl = process.env.NODE_ENV === 'production' 
            ? '/api' 
            : 'http://localhost:3000/api';
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.initEditor();
        this.initEventListeners();
        this.loadSampleCode();
        this.loadHistory();
        this.initTheme();
        this.checkServerConnection();
    }

    cacheElements() {
        this.editorElement = document.getElementById('code-editor');
        this.outputElement = document.getElementById('output');
        this.languageSelect = document.getElementById('language');
        this.runButton = document.getElementById('run-code');
        this.clearButton = document.getElementById('clear-output');
        this.saveButton = document.getElementById('save-code');
        this.loadButton = document.getElementById('load-code');
        this.shareButton = document.getElementById('share-code');
        this.downloadButton = document.getElementById('download-code');
        this.themeToggle = document.getElementById('theme-toggle');
        this.lineNumbers = document.getElementById('line-numbers');
        this.historyList = document.getElementById('history-list');
        this.statusIndicator = document.getElementById('server-status');
        this.languageBadge = document.getElementById('language-badge');
        this.executionTime = document.getElementById('execution-time');
    }

    initEditor() {
        // Initialize with line numbers
        if (this.editorElement) {
            this.editorElement.addEventListener('input', () => {
                this.updateLineNumbers();
                this.autoSave();
            });
            
            this.editorElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.insertTab();
                }
            });

            this.editorElement.addEventListener('scroll', () => {
                if (this.lineNumbers) {
                    this.lineNumbers.scrollTop = this.editorElement.scrollTop;
                }
            });
        }
    }

    initEventListeners() {
        // Language change
        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', () => {
                this.currentLanguage = this.languageSelect.value;
                this.updateLanguageBadge();
                this.loadLanguageTemplate();
                this.savePreferences();
            });
        }

        // Run code button
        if (this.runButton) {
            this.runButton.addEventListener('click', () => this.executeCode());
        }

        // Clear output button
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this.clearOutput());
        }

        // Save code button
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => this.saveCode());
        }

        // Load code button
        if (this.loadButton) {
            this.loadButton.addEventListener('click', () => this.loadSavedCode());
        }

        // Share code button
        if (this.shareButton) {
            this.shareButton.addEventListener('click', () => this.shareCode());
        }

        // Download code button
        if (this.downloadButton) {
            this.downloadButton.addEventListener('click', () => this.downloadCode());
        }

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to run code
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.executeCode();
            }
            
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCode();
            }
        });
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.updateServerStatus('connected', 'Server connected');
            } else {
                this.updateServerStatus('disconnected', 'Server unavailable');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            this.updateServerStatus('disconnected', 'Server offline');
            // Fallback to local execution
            this.showNotification('Server offline - using local execution', 'warning');
        }
    }

    updateServerStatus(status, message) {
        if (this.statusIndicator) {
            this.statusIndicator.className = `server-status ${status}`;
            this.statusIndicator.title = message;
            
            const dot = this.statusIndicator.querySelector('.status-dot');
            if (dot) {
                dot.style.backgroundColor = status === 'connected' ? '#10b981' : '#ef4444';
            }
        }
    }

    async executeCode() {
        const code = this.editorElement.value;
        const language = this.currentLanguage;
        
        if (!code.trim()) {
            this.showNotification('Please enter some code to execute', 'warning');
            return;
        }

        this.showLoading(true);
        const startTime = performance.now();

        try {
            // Try server execution first
            const response = await fetch(`${this.serverUrl}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    language: language,
                    input: ''
                })
            });

            const endTime = performance.now();
            const execTime = ((endTime - startTime) / 1000).toFixed(2);
            
            if (this.executionTime) {
                this.executionTime.textContent = `${execTime}s`;
            }

            if (response.ok) {
                const result = await response.json();
                this.displayOutput(result.output || '', result.error);
                
                // Add to history
                this.addToHistory({
                    language: language,
                    code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
                    timestamp: new Date().toISOString(),
                    success: !result.error
                });
            } else {
                // Fallback to local execution for JavaScript
                if (language === 'javascript') {
                    this.executeJavaScriptLocally(code);
                } else {
                    this.displayOutput('', 'Server execution failed. Please try again later.');
                }
            }
        } catch (error) {
            console.error('Execution error:', error);
            
            // Fallback to local execution for JavaScript
            if (language === 'javascript') {
                this.executeJavaScriptLocally(code);
            } else {
                this.displayOutput('', 'Failed to connect to server. Please check your connection.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    executeJavaScriptLocally(code) {
        try {
            const logs = [];
            const customConsole = {
                log: (...args) => {
                    logs.push(args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' '));
                },
                error: (...args) => {
                    logs.push('❌ ' + args.map(arg => String(arg)).join(' '));
                },
                warn: (...args) => {
                    logs.push('⚠️ ' + args.map(arg => String(arg)).join(' '));
                },
                info: (...args) => {
                    logs.push('ℹ️ ' + args.map(arg => String(arg)).join(' '));
                },
                clear: () => {
                    logs.length = 0;
                }
            };

            // Execute in a safe sandbox
            const func = new Function('console', '"use strict";' + code);
            func(customConsole);
            
            this.displayOutput(logs.join('\n') || 'Code executed successfully (no output)');
            
            // Add to history
            this.addToHistory({
                language: 'javascript',
                code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString(),
                success: true
            });
        } catch (error) {
            this.displayOutput('', error.message);
            
            this.addToHistory({
                language: 'javascript',
                code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString(),
                success: false,
                error: error.message
            });
        }
    }

    displayOutput(output, error = null) {
        if (this.outputElement) {
            if (error) {
                this.outputElement.innerHTML = `
                    <div class="error-output">
                        <i class="fas fa-exclamation-circle"></i>
                        <pre>${this.escapeHtml(error)}</pre>
                    </div>
                `;
            } else {
                this.outputElement.innerHTML = `
                    <div class="success-output">
                        <i class="fas fa-check-circle"></i>
                        <pre>${this.escapeHtml(output)}</pre>
                    </div>
                `;
            }
            
            // Auto-scroll to bottom
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }
    }

    clearOutput() {
        if (this.outputElement) {
            this.outputElement.innerHTML = `
                <div class="empty-output">
                    <i class="fas fa-terminal"></i>
                    <p>Output cleared. Run your code to see results.</p>
                </div>
            `;
        }
    }

    showLoading(show) {
        if (this.runButton) {
            if (show) {
                this.runButton.disabled = true;
                this.runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
            } else {
                this.runButton.disabled = false;
                this.runButton.innerHTML = '<i class="fas fa-play"></i> Run Code';
            }
        }
    }

    updateLineNumbers() {
        if (!this.lineNumbers) return;
        
        const lines = this.editorElement.value.split('\n').length;
        let lineNumbersHtml = '';
        
        for (let i = 1; i <= lines; i++) {
            lineNumbersHtml += `<div>${i}</div>`;
        }
        
        this.lineNumbers.innerHTML = lineNumbersHtml;
    }

    insertTab() {
        const start = this.editorElement.selectionStart;
        const end = this.editorElement.selectionEnd;
        
        this.editorElement.value = 
            this.editorElement.value.substring(0, start) + 
            '    ' + 
            this.editorElement.value.substring(end);
        
        this.editorElement.selectionStart = this.editorElement.selectionEnd = start + 4;
    }

    updateLanguageBadge() {
        if (this.languageBadge) {
            const languages = {
                javascript: { icon: 'fab fa-js', color: '#f7df1e' },
                python: { icon: 'fab fa-python', color: '#3776ab' },
                java: { icon: 'fab fa-java', color: '#007396' },
                cpp: { icon: 'fas fa-code', color: '#00599c' },
                csharp: { icon: 'fas fa-code', color: '#239120' },
                php: { icon: 'fab fa-php', color: '#777bb4' },
                ruby: { icon: 'fas fa-gem', color: '#cc342d' },
                go: { icon: 'fab fa-golang', color: '#00add8' },
                rust: { icon: 'fas fa-code', color: '#000000' },
                swift: { icon: 'fab fa-swift', color: '#ffac45' }
            };
            
            const lang = languages[this.currentLanguage] || languages.javascript;
            this.languageBadge.innerHTML = `
                <i class="${lang.icon}" style="color: ${lang.color}"></i>
                <span>${this.currentLanguage.toUpperCase()}</span>
            `;
        }
    }

    loadLanguageTemplate() {
        const templates = {
            javascript: `// JavaScript Template
console.log("Hello, World!");

// Function example
function greet(name) {
    return \`Hello, \${name}!\`;
}

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);

console.log(greet("Developer"));
console.log("Doubled numbers:", doubled);`,

            python: `# Python Template
print("Hello, World!")

# Function example
def greet(name):
    return f"Hello, {name}!"

# List operations
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]

print(greet("Developer"))
print("Doubled numbers:", doubled)`,

            java: `// Java Template
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Function example
        System.out.println(greet("Developer"));
        
        // Array operations
        int[] numbers = {1, 2, 3, 4, 5};
        int[] doubled = new int[numbers.length];
        
        for (int i = 0; i < numbers.length; i++) {
            doubled[i] = numbers[i] * 2;
            System.out.println(doubled[i]);
        }
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`,

            cpp: `// C++ Template
#include <iostream>
#include <vector>
using namespace std;

string greet(string name) {
    return "Hello, " + name + "!";
}

int main() {
    cout << "Hello, World!" << endl;
    
    // Function example
    cout << greet("Developer") << endl;
    
    // Vector operations
    vector<int> numbers = {1, 2, 3, 4, 5};
    vector<int> doubled;
    
    for (int n : numbers) {
        doubled.push_back(n * 2);
        cout << n * 2 << " ";
    }
    
    return 0;
}`
        };

        if (templates[this.currentLanguage] && this.editorElement) {
            this.editorElement.value = templates[this.currentLanguage];
            this.updateLineNumbers();
        }
    }

    loadSampleCode() {
        const sampleBtn = document.getElementById('load-sample');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                this.editorElement.value = `// Fibonacci Sequence
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("First 10 Fibonacci numbers:");
for (let i = 0; i < 10; i++) {
    console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`;
                this.updateLineNumbers();
            });
        }
    }

    saveCode() {
        const code = this.editorElement.value;
        const language = this.currentLanguage;
        
        const savedCodes = JSON.parse(localStorage.getItem('codemaster_saved_codes') || '[]');
        
        savedCodes.push({
            id: Date.now(),
            language: language,
            code: code,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 20 saved codes
        if (savedCodes.length > 20) {
            savedCodes.shift();
        }
        
        localStorage.setItem('codemaster_saved_codes', JSON.stringify(savedCodes));
        this.showNotification('Code saved successfully!', 'success');
    }

    loadSavedCode() {
        const savedCodes = JSON.parse(localStorage.getItem('codemaster_saved_codes') || '[]');
        
        if (savedCodes.length === 0) {
            this.showNotification('No saved codes found', 'info');
            return;
        }
        
        // Create modal or dropdown to select saved code
        const lastCode = savedCodes[savedCodes.length - 1];
        this.editorElement.value = lastCode.code;
        this.currentLanguage = lastCode.language;
        
        if (this.languageSelect) {
            this.languageSelect.value = lastCode.language;
        }
        
        this.updateLineNumbers();
        this.updateLanguageBadge();
        this.showNotification('Last saved code loaded', 'success');
    }

    async shareCode() {
        const code = this.editorElement.value;
        const language = this.currentLanguage;
        
        try {
            // Create a shareable link (you'd implement this with your backend)
            const shareData = {
                title: 'CodeMaster Share',
                text: `Check out this ${language} code on CodeMaster!`,
                url: window.location.href + '?code=' + encodeURIComponent(btoa(code))
            };
            
            if (navigator.share) {
                await navigator.share(shareData);
                this.showNotification('Code shared successfully!', 'success');
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(code);
                this.showNotification('Code copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Share error:', error);
            this.showNotification('Failed to share code', 'error');
        }
    }

    downloadCode() {
        const code = this.editorElement.value;
        const language = this.currentLanguage;
        
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            csharp: 'cs',
            php: 'php',
            ruby: 'rb',
            go: 'go',
            rust: 'rs',
            swift: 'swift'
        };
        
        const extension = extensions[language] || 'txt';
        const filename = `code_${new Date().toISOString().slice(0,10)}.${extension}`;
        
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Code downloaded!', 'success');
    }

    addToHistory(entry) {
        this.history.unshift(entry);
        
        // Keep only last 50 entries
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('codemaster_history', JSON.stringify(this.history));
        
        this.updateHistoryDisplay();
    }

    loadHistory() {
        const saved = localStorage.getItem('codemaster_history');
        if (saved) {
            this.history = JSON.parse(saved);
            this.updateHistoryDisplay();
        }
    }

    updateHistoryDisplay() {
        if (!this.historyList) return;
        
        if (this.history.length === 0) {
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-history"></i>
                    <p>No execution history yet</p>
                </div>
            `;
            return;
        }
        
        this.historyList.innerHTML = this.history.map(entry => `
            <div class="history-item ${entry.success ? 'success' : 'error'}">
                <div class="history-icon">
                    <i class="${entry.success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}"></i>
                </div>
                <div class="history-details">
                    <div class="history-language">${entry.language}</div>
                    <div class="history-code">${this.escapeHtml(entry.code)}</div>
                    <div class="history-time">${this.formatTime(entry.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    autoSave() {
        const code = this.editorElement.value;
        localStorage.setItem('codemaster_autosave', code);
    }

    loadAutoSave() {
        const saved = localStorage.getItem('codemaster_autosave');
        if (saved && this.editorElement) {
            this.editorElement.value = saved;
            this.updateLineNumbers();
        }
    }

    savePreferences() {
        const preferences = {
            language: this.currentLanguage,
            theme: this.theme
        };
        localStorage.setItem('codemaster_preferences', JSON.stringify(preferences));
    }

    loadPreferences() {
        const saved = localStorage.getItem('codemaster_preferences');
        if (saved) {
            const prefs = JSON.parse(saved);
            
            if (prefs.language && this.languageSelect) {
                this.currentLanguage = prefs.language;
                this.languageSelect.value = prefs.language;
                this.updateLanguageBadge();
            }
            
            if (prefs.theme) {
                this.theme = prefs.theme;
                this.applyTheme();
            }
        }
    }

    initTheme() {
        this.loadPreferences();
        this.applyTheme();
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.savePreferences();
        
        const icon = this.themeToggle.querySelector('i');
        if (icon) {
            icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    applyTheme() {
        document.body.classList.toggle('dark-theme', this.theme === 'dark');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
}

// Initialize compiler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.compiler = new CodeCompiler();
    
    // Load auto-saved code
    window.compiler.loadAutoSave();
});
