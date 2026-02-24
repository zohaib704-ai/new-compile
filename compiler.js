// compiler.js - CodeMaster Compiler with Piston API

class CodeMasterCompiler {
    constructor() {
        this.currentLanguage = 'javascript';
        this.output = [];
        this.history = [];
        this.theme = localStorage.getItem('codemaster_theme') || 'dark';
        // Use Piston API - no server needed!
        this.apiUrl = 'https://emkc.org/api/v2/piston';
        this.savedCodes = [];
        this.executionCount = 0;
        this.isRunning = false;
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.initEventListeners();
        this.loadLanguageTemplates();
        this.loadHistory();
        this.loadSavedCodes();
        this.initTheme();
        this.checkApiStatus();
        this.updateLineNumbers();
        this.loadAutoSave();
        this.populateLanguageSelect();
    }

    cacheElements() {
        this.editor = document.getElementById('code-editor');
        this.outputElement = document.getElementById('output');
        this.languageSelect = document.getElementById('language');
        this.runBtn = document.getElementById('run-code');
        this.clearBtn = document.getElementById('clear-output');
        this.saveBtn = document.getElementById('save-code');
        this.loadBtn = document.getElementById('load-code');
        this.shareBtn = document.getElementById('share-code');
        this.downloadBtn = document.getElementById('download-code');
        this.sampleBtn = document.getElementById('load-sample');
        this.themeToggle = document.getElementById('theme-toggle');
        this.lineNumbers = document.getElementById('line-numbers');
        this.historyList = document.getElementById('history-list');
        this.statusIndicator = document.getElementById('server-status');
        this.languageBadge = document.getElementById('language-badge');
        this.executionTime = document.getElementById('execution-time');
        this.statsExecutions = document.getElementById('stats-executions');
        this.statsLanguages = document.getElementById('stats-languages');
        this.statsSaved = document.getElementById('stats-saved');
    }

    // Available languages from Piston API
    getAvailableLanguages() {
        return [
            { name: 'JavaScript', value: 'javascript', version: '18.15.0', icon: 'fab fa-js' },
            { name: 'Python', value: 'python', version: '3.10.0', icon: 'fab fa-python' },
            { name: 'Java', value: 'java', version: '15.0.2', icon: 'fab fa-java' },
            { name: 'C++', value: 'cpp', version: '10.2.0', icon: 'fas fa-code' },
            { name: 'C', value: 'c', version: '10.2.0', icon: 'fas fa-code' },
            { name: 'C#', value: 'csharp', version: '6.12.0', icon: 'fas fa-code' },
            { name: 'PHP', value: 'php', version: '8.2.3', icon: 'fab fa-php' },
            { name: 'Ruby', value: 'ruby', version: '3.0.1', icon: 'fas fa-gem' },
            { name: 'Go', value: 'go', version: '1.16.4', icon: 'fab fa-golang' },
            { name: 'Rust', value: 'rust', version: '1.68.2', icon: 'fas fa-code' },
            { name: 'Swift', value: 'swift', version: '5.3.3', icon: 'fab fa-swift' },
            { name: 'TypeScript', value: 'typescript', version: '5.0.3', icon: 'fas fa-code' },
            { name: 'Kotlin', value: 'kotlin', version: '1.8.20', icon: 'fas fa-code' },
            { name: 'R', value: 'r', version: '4.3.0', icon: 'fas fa-code' },
            { name: 'Perl', value: 'perl', version: '5.36.0', icon: 'fas fa-code' },
            { name: 'Lua', value: 'lua', version: '5.4.4', icon: 'fas fa-code' },
            { name: 'Haskell', value: 'haskell', version: '9.0.1', icon: 'fas fa-code' },
            { name: 'Elixir', value: 'elixir', version: '1.11.3', icon: 'fas fa-code' },
            { name: 'Dart', value: 'dart', version: '2.19.0', icon: 'fas fa-code' },
            { name: 'SQL', value: 'sql', version: '3.36.0', icon: 'fas fa-database' }
        ];
    }

    populateLanguageSelect() {
        if (!this.languageSelect) return;
        
        const languages = this.getAvailableLanguages();
        const grouped = {
            'Popular': ['javascript', 'python', 'java', 'cpp', 'csharp', 'php'],
            'Web': ['typescript', 'dart'],
            'System': ['c', 'rust', 'go'],
            'Other': ['ruby', 'swift', 'kotlin', 'r', 'perl', 'lua', 'haskell', 'elixir', 'sql']
        };

        let html = '';
        
        for (const [group, values] of Object.entries(grouped)) {
            html += `<optgroup label="${group}">`;
            languages.filter(lang => values.includes(lang.value)).forEach(lang => {
                html += `<option value="${lang.value}" ${lang.value === this.currentLanguage ? 'selected' : ''}>
                    ${lang.name}
                </option>`;
            });
            html += `</optgroup>`;
        }
        
        this.languageSelect.innerHTML = html;
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/runtimes`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const runtimes = await response.json();
                this.updateServerStatus('connected', `Piston API (${runtimes.length} languages)`);
                console.log(`Piston API connected - ${runtimes.length} languages available`);
            } else {
                this.updateServerStatus('disconnected', 'API unavailable');
            }
        } catch (error) {
            console.error('API connection error:', error);
            this.updateServerStatus('disconnected', 'Using local fallback');
            this.showNotification('API offline - using local JavaScript only', 'warning');
        }
    }

    updateServerStatus(status, message) {
        if (this.statusIndicator) {
            this.statusIndicator.className = `server-status ${status}`;
            this.statusIndicator.title = message;
            
            const dot = this.statusIndicator.querySelector('.status-dot');
            const text = this.statusIndicator.querySelector('span:last-child');
            
            if (dot) {
                dot.style.backgroundColor = status === 'connected' ? '#10b981' : '#ef4444';
            }
            
            if (text) {
                text.textContent = message;
            }
        }
    }

    async executeCode() {
        const code = this.editor.value;
        const language = this.currentLanguage;
        
        if (!code.trim()) {
            this.showNotification('Please enter some code to execute', 'warning');
            return;
        }

        if (this.isRunning) return;
        
        this.isRunning = true;
        this.showLoading(true);
        
        const startTime = performance.now();
        this.clearOutput();
        this.displayOutput('⏳ Executing code...', 'info');

        try {
            // Get language config
            const languages = this.getAvailableLanguages();
            const langConfig = languages.find(l => l.value === language);
            
            if (!langConfig) {
                throw new Error(`Language ${language} not supported`);
            }

            // Prepare request for Piston API
            const requestBody = {
                language: language,
                version: langConfig.version,
                files: [
                    {
                        name: `main.${this.getFileExtension(language)}`,
                        content: code
                    }
                ],
                stdin: "",
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000
            };

            console.log('Sending request to Piston API:', requestBody);

            const response = await fetch(`${this.apiUrl}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }

            const result = await response.json();
            console.log('Piston API response:', result);

            const endTime = performance.now();
            const execTime = ((endTime - startTime) / 1000).toFixed(3);
            
            if (this.executionTime) {
                this.executionTime.textContent = `${execTime}s`;
            }

            // Process output
            let output = '';
            let error = '';

            if (result.run) {
                if (result.run.stdout) output = result.run.stdout;
                if (result.run.stderr) error = result.run.stderr;
                if (result.run.output) output = result.run.output;
            }

            if (result.compile) {
                if (result.compile.stdout) output = result.compile.stdout + '\n' + output;
                if (result.compile.stderr) error = result.compile.stderr + '\n' + error;
            }

            // Display results
            if (error && !output) {
                this.displayOutput('', error);
                this.addToHistory({
                    language: language,
                    code: this.truncateCode(code),
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: error,
                    execTime: execTime
                });
            } else {
                this.displayOutput(output || '✓ Code executed successfully (no output)', error);
                this.addToHistory({
                    language: language,
                    code: this.truncateCode(code),
                    timestamp: new Date().toISOString(),
                    success: true,
                    execTime: execTime
                });
            }
            
            this.updateStats(true);

        } catch (error) {
            console.error('Execution error:', error);
            
            // Fallback to local JavaScript
            if (language === 'javascript') {
                this.executeJavaScriptLocally(code, startTime);
            } else {
                this.displayOutput('', `❌ Execution failed: ${error.message}\n\n💡 Tip: JavaScript works offline, other languages need API connection.`);
                this.showNotification('Execution failed - check console', 'error');
                
                this.addToHistory({
                    language: language,
                    code: this.truncateCode(code),
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: error.message
                });
            }
        } finally {
            this.isRunning = false;
            this.showLoading(false);
        }
    }

    getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            csharp: 'cs',
            php: 'php',
            ruby: 'rb',
            go: 'go',
            rust: 'rs',
            swift: 'swift',
            typescript: 'ts',
            kotlin: 'kt',
            r: 'r',
            perl: 'pl',
            lua: 'lua',
            haskell: 'hs',
            elixir: 'ex',
            dart: 'dart',
            sql: 'sql'
        };
        return extensions[language] || 'txt';
    }

    executeJavaScriptLocally(code, startTime) {
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
                }
            };

            // Safe execution with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Execution timeout (5s)')), 5000);
            });

            const executionPromise = new Promise((resolve) => {
                const func = new Function('console', '"use strict";' + code);
                func(customConsole);
                resolve(logs.join('\n') || '✓ Code executed successfully (no output)');
            });

            Promise.race([executionPromise, timeoutPromise]).then(output => {
                const endTime = performance.now();
                const execTime = ((endTime - startTime) / 1000).toFixed(3);
                
                if (this.executionTime) {
                    this.executionTime.textContent = `${execTime}s`;
                }
                
                this.displayOutput(output);
                this.addToHistory({
                    language: 'javascript',
                    code: this.truncateCode(code),
                    timestamp: new Date().toISOString(),
                    success: true,
                    execTime: execTime
                });
                
                this.updateStats(true);
            }).catch(error => {
                throw error;
            });

        } catch (error) {
            const endTime = performance.now();
            const execTime = ((endTime - startTime) / 1000).toFixed(3);
            
            if (this.executionTime) {
                this.executionTime.textContent = `${execTime}s`;
            }
            
            this.displayOutput('', error.message);
            this.addToHistory({
                language: 'javascript',
                code: this.truncateCode(code),
                timestamp: new Date().toISOString(),
                success: false,
                error: error.message,
                execTime: execTime
            });
        }
    }

    displayOutput(output, error = null) {
        if (!this.outputElement) return;
        
        const timestamp = new Date().toLocaleTimeString();
        
        // Escape HTML to prevent XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        if (error) {
            this.outputElement.innerHTML = `
                <div class="output-entry error">
                    <div class="output-header">
                        <span class="output-time">${timestamp}</span>
                        <span class="output-badge error">Error</span>
                    </div>
                    <pre class="output-content error">${escapeHtml(error)}</pre>
                </div>
            `;
        } else if (output) {
            // Check if output is JSON and format it
            let formattedOutput = output;
            try {
                if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
                    const jsonOutput = JSON.parse(output);
                    formattedOutput = JSON.stringify(jsonOutput, null, 2);
                }
            } catch (e) {
                // Not JSON, keep as is
            }
            
            this.outputElement.innerHTML = `
                <div class="output-entry success">
                    <div class="output-header">
                        <span class="output-time">${timestamp}</span>
                        <span class="output-badge success">Success</span>
                    </div>
                    <pre class="output-content">${escapeHtml(formattedOutput)}</pre>
                </div>
            `;
        } else {
            this.outputElement.innerHTML = `
                <div class="output-entry info">
                    <div class="output-header">
                        <span class="output-time">${timestamp}</span>
                        <span class="output-badge info">Info</span>
                    </div>
                    <pre class="output-content">No output produced</pre>
                </div>
            `;
        }
        
        // Auto-scroll to bottom
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    clearOutput() {
        if (this.outputElement) {
            this.outputElement.innerHTML = `
                <div class="output-placeholder">
                    <i class="fas fa-terminal"></i>
                    <p>Output cleared. Run your code to see results.</p>
                </div>
            `;
        }
    }

    showLoading(show) {
        if (this.runBtn) {
            if (show) {
                this.runBtn.disabled = true;
                this.runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
            } else {
                this.runBtn.disabled = false;
                this.runBtn.innerHTML = '<i class="fas fa-play"></i> Run Code';
            }
        }
    }

    loadLanguageTemplates() {
        this.templates = {
            javascript: `// JavaScript Template
// Welcome to CodeMaster Compiler with Piston API!

// Function to calculate factorial
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);

// Output results
console.log("Factorial of 5:", factorial(5));
console.log("Doubled numbers:", doubled);

// Current date and time
console.log("Current time:", new Date().toLocaleTimeString());`,

            python: `# Python Template
# Welcome to CodeMaster Compiler with Piston API!

# Function to calculate factorial
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

# List operations
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]

# Output results
print(f"Factorial of 5: {factorial(5)}")
print(f"Doubled numbers: {doubled}")

# Current date and time
from datetime import datetime
print(f"Current time: {datetime.now().strftime('%H:%M:%S')}")`,

            java: `// Java Template
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from CodeMaster!");
        
        // Calculate factorial
        System.out.println("Factorial of 5: " + factorial(5));
        
        // Array operations
        int[] numbers = {1, 2, 3, 4, 5};
        System.out.print("Doubled numbers: ");
        for (int n : numbers) {
            System.out.print((n * 2) + " ");
        }
        System.out.println();
    }
    
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
}`,

            cpp: `// C++ Template
#include <iostream>
#include <vector>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    cout << "Hello from CodeMaster!" << endl;
    
    // Calculate factorial
    cout << "Factorial of 5: " << factorial(5) << endl;
    
    // Vector operations
    vector<int> numbers = {1, 2, 3, 4, 5};
    cout << "Doubled numbers: ";
    for (int n : numbers) {
        cout << (n * 2) << " ";
    }
    cout << endl;
    
    return 0;
}`,

            php: `<?php
// PHP Template
echo "Hello from CodeMaster!\\n";

// Function to calculate factorial
function factorial($n) {
    if ($n <= 1) return 1;
    return $n * factorial($n - 1);
}

// Array operations
$numbers = [1, 2, 3, 4, 5];
$doubled = array_map(function($n) { return $n * 2; }, $numbers);

echo "Factorial of 5: " . factorial(5) . "\\n";
echo "Doubled numbers: " . implode(", ", $doubled) . "\\n";
?>`
        };

        // Load template for current language
        this.loadLanguageTemplate();
    }

    loadLanguageTemplate() {
        if (this.templates[this.currentLanguage] && this.editor) {
            this.editor.value = this.templates[this.currentLanguage];
            this.updateLineNumbers();
        }
    }

    updateLineNumbers() {
        if (!this.lineNumbers || !this.editor) return;
        
        const lines = this.editor.value.split('\n').length;
        let lineNumbersHtml = '';
        
        for (let i = 1; i <= lines; i++) {
            lineNumbersHtml += `<div class="line-number">${i}</div>`;
        }
        
        this.lineNumbers.innerHTML = lineNumbersHtml;
        
        // Sync scroll
        this.lineNumbers.scrollTop = this.editor.scrollTop;
    }

    addToHistory(entry) {
        this.history.unshift(entry);
        
        // Keep only last 20 entries
        if (this.history.length > 20) {
            this.history.pop();
        }
        
        localStorage.setItem('codemaster_history', JSON.stringify(this.history));
        this.updateHistoryDisplay();
        this.updateStats();
    }

    loadHistory() {
        const saved = localStorage.getItem('codemaster_history');
        if (saved) {
            this.history = JSON.parse(saved);
            this.updateHistoryDisplay();
        }
    }

    loadSavedCodes() {
        const saved = localStorage.getItem('codemaster_saved_codes');
        if (saved) {
            this.savedCodes = JSON.parse(saved);
        }
        this.updateStats();
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
                    <div class="history-meta">
                        <span class="history-time">${this.formatTime(entry.timestamp)}</span>
                        ${entry.execTime ? `<span class="history-time"><i class="fas fa-clock"></i> ${entry.execTime}s</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        if (this.statsExecutions) {
            this.statsExecutions.textContent = this.history.length;
        }
        
        if (this.statsLanguages) {
            const uniqueLanguages = new Set(this.history.map(h => h.language)).size;
            this.statsLanguages.textContent = uniqueLanguages;
        }
        
        if (this.statsSaved) {
            this.statsSaved.textContent = this.savedCodes.length;
        }
    }

    saveCode() {
        const code = this.editor.value;
        const language = this.currentLanguage;
        
        if (!code.trim()) {
            this.showNotification('No code to save', 'warning');
            return;
        }
        
        const savedCodes = JSON.parse(localStorage.getItem('codemaster_saved_codes') || '[]');
        
        const newSave = {
            id: Date.now(),
            language: language,
            code: code,
            timestamp: new Date().toISOString(),
            description: prompt('Enter a description (optional):', `Code ${savedCodes.length + 1}`) || `Code ${savedCodes.length + 1}`
        };
        
        savedCodes.push(newSave);
        
        // Keep only last 20
        if (savedCodes.length > 20) {
            savedCodes.shift();
        }
        
        localStorage.setItem('codemaster_saved_codes', JSON.stringify(savedCodes));
        this.savedCodes = savedCodes;
        this.updateStats();
        this.showNotification('Code saved!', 'success');
    }

    loadAutoSave() {
        const saved = localStorage.getItem('codemaster_autosave');
        if (saved && this.editor && this.editor.value === '') {
            this.editor.value = saved;
            this.updateLineNumbers();
        }
    }

    autoSave() {
        const code = this.editor.value;
        localStorage.setItem('codemaster_autosave', code);
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

        // Run code
        if (this.runBtn) {
            this.runBtn.addEventListener('click', () => this.executeCode());
        }

        // Clear output
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearOutput());
        }

        // Save code
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveCode());
        }

        // Load code
        if (this.loadBtn) {
            this.loadBtn.addEventListener('click', () => this.showSavedCodes());
        }

        // Share code
        if (this.shareBtn) {
            this.shareBtn.addEventListener('click', () => this.shareCode());
        }

        // Download code
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadCode());
        }

        // Load sample
        if (this.sampleBtn) {
            this.sampleBtn.addEventListener('click', () => this.loadSampleCode());
        }

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Editor events
        if (this.editor) {
            this.editor.addEventListener('input', () => {
                this.updateLineNumbers();
                this.autoSave();
            });

            this.editor.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.insertTab();
                }
                
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.executeCode();
                }
                
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    this.saveCode();
                }
            });

            this.editor.addEventListener('scroll', () => {
                if (this.lineNumbers) {
                    this.lineNumbers.scrollTop = this.editor.scrollTop;
                }
            });
        }
    }

    updateLanguageBadge() {
        if (!this.languageBadge) return;
        
        const languages = {
            javascript: { icon: 'fab fa-js', color: '#f7df1e', name: 'JavaScript' },
            python: { icon: 'fab fa-python', color: '#3776ab', name: 'Python' },
            java: { icon: 'fab fa-java', color: '#007396', name: 'Java' },
            cpp: { icon: 'fas fa-code', color: '#00599c', name: 'C++' },
            c: { icon: 'fas fa-code', color: '#555555', name: 'C' },
            csharp: { icon: 'fas fa-code', color: '#239120', name: 'C#' },
            php: { icon: 'fab fa-php', color: '#777bb4', name: 'PHP' },
            ruby: { icon: 'fas fa-gem', color: '#cc342d', name: 'Ruby' },
            go: { icon: 'fab fa-golang', color: '#00add8', name: 'Go' },
            rust: { icon: 'fas fa-code', color: '#000000', name: 'Rust' },
            swift: { icon: 'fab fa-swift', color: '#ffac45', name: 'Swift' },
            typescript: { icon: 'fas fa-code', color: '#3178c6', name: 'TypeScript' },
            kotlin: { icon: 'fas fa-code', color: '#7F52FF', name: 'Kotlin' },
            r: { icon: 'fas fa-code', color: '#276DC3', name: 'R' },
            perl: { icon: 'fas fa-code', color: '#39457E', name: 'Perl' },
            lua: { icon: 'fas fa-code', color: '#000080', name: 'Lua' },
            haskell: { icon: 'fas fa-code', color: '#5e5086', name: 'Haskell' },
            elixir: { icon: 'fas fa-code', color: '#4e2a8e', name: 'Elixir' },
            dart: { icon: 'fas fa-code', color: '#00B4AB', name: 'Dart' },
            sql: { icon: 'fas fa-database', color: '#e38d13', name: 'SQL' }
        };
        
        const lang = languages[this.currentLanguage] || languages.javascript;
        this.languageBadge.innerHTML = `
            <i class="${lang.icon}" style="color: ${lang.color}"></i>
            <span>${lang.name}</span>
        `;
    }

    insertTab() {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        
        this.editor.value = 
            this.editor.value.substring(0, start) + 
            '    ' + 
            this.editor.value.substring(end);
        
        this.editor.selectionStart = this.editor.selectionEnd = start + 4;
        this.updateLineNumbers();
    }

    async shareCode() {
        const code = this.editor.value;
        
        if (!code.trim()) {
            this.showNotification('No code to share', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(code);
            this.showNotification('Code copied to clipboard!', 'success');
        } catch (error) {
            this.showNotification('Failed to copy', 'error');
        }
    }

    downloadCode() {
        const code = this.editor.value;
        const language = this.currentLanguage;
        
        if (!code.trim()) {
            this.showNotification('No code to download', 'warning');
            return;
        }
        
        const extension = this.getFileExtension(language);
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

    showSavedCodes() {
        const savedCodes = JSON.parse(localStorage.getItem('codemaster_saved_codes') || '[]');
        
        if (savedCodes.length === 0) {
            this.showNotification('No saved codes found', 'info');
            return;
        }
        
        // Simple implementation - just load the most recent
        const mostRecent = savedCodes[savedCodes.length - 1];
        this.editor.value = mostRecent.code;
        this.currentLanguage = mostRecent.language;
        if (this.languageSelect) {
            this.languageSelect.value = mostRecent.language;
        }
        this.updateLanguageBadge();
        this.updateLineNumbers();
        this.showNotification('Loaded most recent code', 'success');
    }

    loadSampleCode() {
        // Cycle through templates
        const templates = Object.keys(this.templates);
        const currentIndex = templates.indexOf(this.currentLanguage);
        const nextIndex = (currentIndex + 1) % templates.length;
        const nextLang = templates[nextIndex];
        
        this.currentLanguage = nextLang;
        if (this.languageSelect) {
            this.languageSelect.value = nextLang;
        }
        this.loadLanguageTemplate();
        this.updateLanguageBadge();
        this.showNotification(`Loaded ${nextLang} sample`, 'success');
    }

    initTheme() {
        this.applyTheme();
        
        const icon = this.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        localStorage.setItem('codemaster_theme', this.theme);
        
        const icon = this.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    applyTheme() {
        document.body.classList.toggle('dark-theme', this.theme === 'dark');
    }

    savePreferences() {
        const preferences = {
            language: this.currentLanguage,
            theme: this.theme
        };
        localStorage.setItem('codemaster_preferences', JSON.stringify(preferences));
    }

    showNotification(message, type = 'info') {
        // Simple alert for now
        console.log(`[${type}] ${message}`);
    }

    truncateCode(code, maxLength = 50) {
        if (code.length <= maxLength) return code;
        return code.substring(0, maxLength) + '...';
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
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }
}

// Initialize compiler
document.addEventListener('DOMContentLoaded', () => {
    window.compiler = new CodeMasterCompiler();
});
