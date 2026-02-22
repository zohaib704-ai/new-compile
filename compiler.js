// compiler.js - CodeMaster Compiler with Server Integration

class CodeMasterCompiler {
    constructor() {
        this.currentLanguage = 'javascript';
        this.output = [];
        this.history = [];
        this.theme = localStorage.getItem('codemaster_theme') || 'dark';
        this.serverUrl = this.getServerUrl();
        this.savedCodes = [];
        this.executionCount = 0;
        this.isRunning = false;
        
        this.init();
    }

    getServerUrl() {
        // Check if we're running on GitHub Pages or local
        if (window.location.hostname.includes('github.io')) {
            return 'https://your-backend-server.com/api'; // Replace with your actual backend URL
        }
        return 'http://localhost:3000/api';
    }

    async init() {
        this.cacheElements();
        this.initEventListeners();
        this.loadLanguageTemplates();
        this.loadHistory();
        this.loadSavedCodes();
        this.initTheme();
        this.checkServerConnection();
        this.updateLineNumbers();
        this.loadAutoSave();
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
                
                // Ctrl/Cmd + Enter to run
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

            this.editor.addEventListener('scroll', () => {
                if (this.lineNumbers) {
                    this.lineNumbers.scrollTop = this.editor.scrollTop;
                }
            });
        }

        // Window resize
        window.addEventListener('resize', () => this.updateLineNumbers());
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                timeout: 3000
            });
            
            if (response.ok) {
                this.updateServerStatus('connected', 'Server connected');
            } else {
                this.updateServerStatus('disconnected', 'Server unavailable');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            this.updateServerStatus('disconnected', 'Using local execution');
            this.showNotification('Server offline - using local JavaScript execution', 'warning');
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
            const execTime = ((endTime - startTime) / 1000).toFixed(3);
            
            if (this.executionTime) {
                this.executionTime.textContent = `${execTime}s`;
            }

            if (response.ok) {
                const result = await response.json();
                this.displayOutput(result.output || '', result.error);
                
                this.addToHistory({
                    language: language,
                    code: this.truncateCode(code),
                    timestamp: new Date().toISOString(),
                    success: !result.error,
                    execTime: execTime
                });
                
                this.updateStats(true);
            } else {
                // Fallback to local execution for JavaScript
                if (language === 'javascript') {
                    this.executeJavaScriptLocally(code, startTime);
                } else {
                    this.displayOutput('', `Server execution failed for ${language}. Please try again later.`);
                    this.addToHistory({
                        language: language,
                        code: this.truncateCode(code),
                        timestamp: new Date().toISOString(),
                        success: false,
                        error: 'Server execution failed'
                    });
                }
            }
        } catch (error) {
            console.error('Execution error:', error);
            
            // Fallback to local execution for JavaScript
            if (language === 'javascript') {
                this.executeJavaScriptLocally(code, startTime);
            } else {
                this.displayOutput('', 'Failed to connect to server. Please check your connection.');
                this.showNotification('Connection failed - using local JavaScript only', 'error');
            }
        } finally {
            this.isRunning = false;
            this.showLoading(false);
        }
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
                },
                clear: () => {
                    logs.length = 0;
                },
                table: (data) => {
                    console.table(data);
                    logs.push(JSON.stringify(data, null, 2));
                }
            };

            // Execute in safe sandbox
            const func = new Function('console', '"use strict";' + code);
            func(customConsole);
            
            const endTime = performance.now();
            const execTime = ((endTime - startTime) / 1000).toFixed(3);
            
            if (this.executionTime) {
                this.executionTime.textContent = `${execTime}s`;
            }
            
            this.displayOutput(logs.join('\n') || 'Code executed successfully (no output)');
            
            this.addToHistory({
                language: 'javascript',
                code: this.truncateCode(code),
                timestamp: new Date().toISOString(),
                success: true,
                execTime: execTime
            });
            
            this.updateStats(true);
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
        
        if (error) {
            this.outputElement.innerHTML = `
                <div class="output-entry error">
                    <div class="output-header">
                        <span class="output-time">${timestamp}</span>
                        <span class="output-badge error">Error</span>
                    </div>
                    <pre class="output-content error">${this.escapeHtml(error)}</pre>
                </div>
            `;
        } else if (output) {
            // Check if output is JSON and format it
            let formattedOutput = output;
            try {
                const jsonOutput = JSON.parse(output);
                formattedOutput = JSON.stringify(jsonOutput, null, 2);
            } catch (e) {
                // Not JSON, keep as is
            }
            
            this.outputElement.innerHTML = `
                <div class="output-entry success">
                    <div class="output-header">
                        <span class="output-time">${timestamp}</span>
                        <span class="output-badge success">Success</span>
                    </div>
                    <pre class="output-content">${this.escapeHtml(formattedOutput)}</pre>
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

    updateLineNumbers() {
        if (!this.lineNumbers || !this.editor) return;
        
        const lines = this.editor.value.split('\n').length;
        let lineNumbersHtml = '';
        
        for (let i = 1; i <= lines; i++) {
            lineNumbersHtml += `<div class="line-number${i === lines ? ' last' : ''}">${i}</div>`;
        }
        
        this.lineNumbers.innerHTML = lineNumbersHtml;
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

    updateLanguageBadge() {
        if (!this.languageBadge) return;
        
        const languages = {
            javascript: { icon: 'fab fa-js', color: '#f7df1e', name: 'JavaScript' },
            python: { icon: 'fab fa-python', color: '#3776ab', name: 'Python' },
            java: { icon: 'fab fa-java', color: '#007396', name: 'Java' },
            cpp: { icon: 'fas fa-code', color: '#00599c', name: 'C++' },
            csharp: { icon: 'fas fa-code', color: '#239120', name: 'C#' },
            php: { icon: 'fab fa-php', color: '#777bb4', name: 'PHP' },
            ruby: { icon: 'fas fa-gem', color: '#cc342d', name: 'Ruby' },
            go: { icon: 'fab fa-golang', color: '#00add8', name: 'Go' },
            rust: { icon: 'fas fa-code', color: '#000000', name: 'Rust' },
            swift: { icon: 'fab fa-swift', color: '#ffac45', name: 'Swift' },
            typescript: { icon: 'fas fa-code', color: '#3178c6', name: 'TypeScript' }
        };
        
        const lang = languages[this.currentLanguage] || languages.javascript;
        this.languageBadge.innerHTML = `
            <i class="${lang.icon}" style="color: ${lang.color}"></i>
            <span>${lang.name}</span>
        `;
    }

    loadLanguageTemplates() {
        this.templates = {
            javascript: `// JavaScript Template
// Welcome to CodeMaster Compiler

// Function to calculate factorial
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);

// Object example
const person = {
    name: "John",
    age: 30,
    greet() {
        return \`Hello, I'm \${this.name}\`;
    }
};

// Output results
console.log("Factorial of 5:", factorial(5));
console.log("Doubled numbers:", doubled);
console.log(person.greet());

// Async example with Promise
const promise = new Promise((resolve) => {
    setTimeout(() => resolve("Async operation complete!"), 100);
});

promise.then(console.log);`,

            python: `# Python Template
# Welcome to CodeMaster Compiler

# Function to calculate factorial
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

# List operations
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]

# Dictionary example
person = {
    "name": "John",
    "age": 30,
    "greet": lambda: f"Hello, I'm {person['name']}"
}

# Output results
print(f"Factorial of 5: {factorial(5)}")
print(f"Doubled numbers: {doubled}")
print(person["greet"]())

# Fibonacci sequence
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print("\\nFibonacci sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`,

            java: `// Java Template
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeMaster!");
        
        // Calculate factorial
        System.out.println("Factorial of 5: " + factorial(5));
        
        // Array operations
        int[] numbers = {1, 2, 3, 4, 5};
        int[] doubled = new int[numbers.length];
        
        for (int i = 0; i < numbers.length; i++) {
            doubled[i] = numbers[i] * 2;
        }
        
        System.out.print("Doubled numbers: ");
        for (int n : doubled) {
            System.out.print(n + " ");
        }
        System.out.println();
        
        // Fibonacci sequence
        System.out.println("\\nFibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            System.out.println("F(" + i + ") = " + fibonacci(i));
        }
    }
    
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`,

            cpp: `// C++ Template
#include <iostream>
#include <vector>
using namespace std;

// Function to calculate factorial
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

// Fibonacci function
int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Hello, CodeMaster!" << endl;
    
    // Calculate factorial
    cout << "Factorial of 5: " << factorial(5) << endl;
    
    // Vector operations
    vector<int> numbers = {1, 2, 3, 4, 5};
    vector<int> doubled;
    
    cout << "Doubled numbers: ";
    for (int n : numbers) {
        doubled.push_back(n * 2);
        cout << n * 2 << " ";
    }
    cout << endl;
    
    // Fibonacci sequence
    cout << "\\nFibonacci sequence:" << endl;
    for (int i = 0; i < 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }
    
    return 0;
}`,

            csharp: `// C# Template
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        Console.WriteLine("Hello, CodeMaster!");
        
        // Calculate factorial
        Console.WriteLine($"Factorial of 5: {Factorial(5)}");
        
        // List operations
        List<int> numbers = new List<int> { 1, 2, 3, 4, 5 };
        List<int> doubled = new List<int>();
        
        Console.Write("Doubled numbers: ");
        foreach (int n in numbers) {
            doubled.Add(n * 2);
            Console.Write(n * 2 + " ");
        }
        Console.WriteLine();
        
        // Fibonacci sequence
        Console.WriteLine("\\nFibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            Console.WriteLine($"F({i}) = {Fibonacci(i)}");
        }
    }
    
    static int Factorial(int n) {
        if (n <= 1) return 1;
        return n * Factorial(n - 1);
    }
    
    static int Fibonacci(int n) {
        if (n <= 1) return n;
        return Fibonacci(n - 1) + Fibonacci(n - 2);
    }
}`,

            php: `<?php
// PHP Template
echo "Hello, CodeMaster!\\n";

// Function to calculate factorial
function factorial($n) {
    if ($n <= 1) return 1;
    return $n * factorial($n - 1);
}

// Array operations
$numbers = [1, 2, 3, 4, 5];
$doubled = array_map(function($n) {
    return $n * 2;
}, $numbers);

echo "Factorial of 5: " . factorial(5) . "\\n";
echo "Doubled numbers: " . implode(", ", $doubled) . "\\n";

// Fibonacci function
function fibonacci($n) {
    if ($n <= 1) return $n;
    return fibonacci($n - 1) + fibonacci($n - 2);
}

echo "\\nFibonacci sequence:\\n";
for ($i = 0; $i < 10; $i++) {
    echo "F($i) = " . fibonacci($i) . "\\n";
}
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

    loadSampleCode() {
        const samples = {
            fibonacci: `// Fibonacci Sequence
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("First 10 Fibonacci numbers:");
for (let i = 0; i < 10; i++) {
    console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
            
            sorting: `// Bubble Sort Implementation
function bubbleSort(arr) {
    let n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log("Original array:", numbers);
console.log("Sorted array:", bubbleSort([...numbers]));`,
            
            palindrome: `// Palindrome Checker
function isPalindrome(str) {
    const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === clean.split('').reverse().join('');
}

const testStrings = [
    "racecar",
    "hello",
    "A man, a plan, a canal: Panama",
    "Was it a car or a cat I saw?"
];

testStrings.forEach(str => {
    console.log(\`"\${str}" is \${isPalindrome(str) ? '' : 'not '}a palindrome\`);
});`,
            
            prime: `// Prime Number Checker
function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

console.log("Prime numbers up to 50:");
for (let i = 2; i <= 50; i++) {
    if (isPrime(i)) {
        console.log(i);
    }
}`
        };

        // Create a modal to select sample
        this.showSampleModal(samples);
    }

    showSampleModal(samples) {
        const modal = document.createElement('div');
        modal.className = 'sample-modal';
        modal.innerHTML = `
            <div class="sample-modal-content">
                <div class="sample-modal-header">
                    <h3><i class="fas fa-code-branch"></i> Choose Sample Code</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="sample-modal-body">
                    ${Object.entries(samples).map(([key, code]) => `
                        <div class="sample-option" data-sample="${key}">
                            <i class="fas fa-file-code"></i>
                            <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelectorAll('.sample-option').forEach(option => {
            option.addEventListener('click', () => {
                const sampleKey = option.dataset.sample;
                if (this.editor) {
                    this.editor.value = samples[sampleKey];
                    this.updateLineNumbers();
                    this.showNotification(`Loaded ${sampleKey} sample`, 'success');
                }
                modal.remove();
            });
        });

        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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
            description: prompt('Enter a description for this code (optional):', `Code ${savedCodes.length + 1}`) || `Code ${savedCodes.length + 1}`
        };
        
        savedCodes.push(newSave);
        
        // Keep only last 20 saved codes
        if (savedCodes.length > 20) {
            savedCodes.shift();
        }
        
        localStorage.setItem('codemaster_saved_codes', JSON.stringify(savedCodes));
        this.savedCodes = savedCodes;
        this.updateStats();
        this.showNotification('Code saved successfully!', 'success');
    }

    showSavedCodes() {
        const savedCodes = JSON.parse(localStorage.getItem('codemaster_saved_codes') || '[]');
        
        if (savedCodes.length === 0) {
            this.showNotification('No saved codes found', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'saved-modal';
        modal.innerHTML = `
            <div class="saved-modal-content">
                <div class="saved-modal-header">
                    <h3><i class="fas fa-folder-open"></i> Saved Codes</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="saved-modal-body">
                    ${savedCodes.map((save, index) => `
                        <div class="saved-item" data-id="${save.id}">
                            <div class="saved-item-info">
                                <span class="saved-language">${save.language}</span>
                                <span class="saved-description">${save.description}</span>
                                <span class="saved-time">${new Date(save.timestamp).toLocaleString()}</span>
                            </div>
                            <div class="saved-item-actions">
                                <button class="load-saved" title="Load code">
                                    <i class="fas fa-folder-open"></i>
                                </button>
                                <button class="delete-saved" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close button
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Load saved code
        modal.querySelectorAll('.load-saved').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const save = savedCodes[index];
                this.editor.value = save.code;
                this.currentLanguage = save.language;
                if (this.languageSelect) {
                    this.languageSelect.value = save.language;
                }
                this.updateLanguageBadge();
                this.updateLineNumbers();
                this.showNotification('Code loaded successfully', 'success');
                modal.remove();
            });
        });

        // Delete saved code
        modal.querySelectorAll('.delete-saved').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this saved code?')) {
                    savedCodes.splice(index, 1);
                    localStorage.setItem('codemaster_saved_codes', JSON.stringify(savedCodes));
                    modal.remove();
                    this.showSavedCodes(); // Refresh modal
                    this.showNotification('Code deleted', 'info');
                }
            });
        });

        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async shareCode() {
        const code = this.editor.value;
        const language = this.currentLanguage;
        
        if (!code.trim()) {
            this.showNotification('No code to share', 'warning');
            return;
        }
        
        try {
            // Create share data
            const shareData = {
                title: 'CodeMaster Code Share',
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
        const code = this.editor.value;
        const language = this.currentLanguage;
        
        if (!code.trim()) {
            this.showNotification('No code to download', 'warning');
            return;
        }
        
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
            swift: 'swift',
            typescript: 'ts'
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
        
        // Keep only last 20 entries
        if (this.history.length > 20) {
            this.history.pop();
        }
        
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

    autoSave() {
        const code = this.editor.value;
        localStorage.setItem('codemaster_autosave', code);
    }

    loadAutoSave() {
        const saved = localStorage.getItem('codemaster_autosave');
        if (saved && this.editor && this.editor.value === '') {
            this.editor.value = saved;
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
        
        const icon = this.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    applyTheme() {
        document.body.classList.toggle('dark-theme', this.theme === 'dark');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
}

// Initialize compiler
document.addEventListener('DOMContentLoaded', () => {
    window.compiler = new CodeMasterCompiler();
});
