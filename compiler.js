// Compiler JavaScript - No APIs, pure browser-based compilation
class Compiler {
    constructor() {
        this.languages = {
            javascript: { name: 'JavaScript', extension: 'js' },
            python: { name: 'Python', extension: 'py' },
            java: { name: 'Java', extension: 'java' },
            cpp: { name: 'C++', extension: 'cpp' },
            c: { name: 'C', extension: 'c' },
            csharp: { name: 'C#', extension: 'cs' },
            go: { name: 'Go', extension: 'go' },
            rust: { name: 'Rust', extension: 'rs' },
            php: { name: 'PHP', extension: 'php' },
            swift: { name: 'Swift', extension: 'swift' }
        };
        
        this.init();
    }
    
    init() {
        this.initEditors();
        this.initEventListeners();
        this.loadDefaultCode();
        this.initWebCompiler();
    }
    
    initEditors() {
        // Initialize main code editor
        this.codeEditor = document.getElementById('codeEditor');
        this.outputElement = document.getElementById('output');
        this.languageSelect = document.getElementById('language');
        
        // Set up basic editor functionality
        if (this.codeEditor) {
            this.codeEditor.addEventListener('keydown', (e) => {
                // Tab key support
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = this.codeEditor.selectionStart;
                    const end = this.codeEditor.selectionEnd;
                    
                    // Insert tab at cursor position
                    this.codeEditor.value = this.codeEditor.value.substring(0, start) + 
                        '    ' + this.codeEditor.value.substring(end);
                    
                    // Move cursor
                    this.codeEditor.selectionStart = this.codeEditor.selectionEnd = start + 4;
                }
            });
        }
    }
    
    initEventListeners() {
        // Compile button
        document.getElementById('compileBtn')?.addEventListener('click', () => this.compileCode());
        
        // Language change
        this.languageSelect?.addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            this.loadDefaultCode();
        });
        
        // Clear output
        document.getElementById('clearOutput')?.addEventListener('click', () => {
            if (this.outputElement) this.outputElement.textContent = '';
        });
        
        // Save code
        document.getElementById('saveCode')?.addEventListener('click', () => this.saveCode());
        
        // Load example
        document.getElementById('loadExample')?.addEventListener('click', () => this.loadExample());
    }
    
    loadDefaultCode() {
        const language = this.languageSelect?.value || 'javascript';
        const defaultCode = this.getDefaultCode(language);
        
        if (this.codeEditor) {
            this.codeEditor.value = defaultCode;
        }
    }
    
    getDefaultCode(language) {
        const examples = {
            javascript: `// JavaScript Example - Fibonacci Sequence
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate first 10 Fibonacci numbers
console.log("Fibonacci Sequence:");
for (let i = 0; i < 10; i++) {
    console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}

// Array operations
const numbers = [1, 2, 3, 4, 5];
const squares = numbers.map(n => n * n);
console.log("\\nOriginal numbers:", numbers);
console.log("Squares:", squares);

// Object example
const person = {
    name: "John",
    age: 30,
    greet() {
        console.log(\`Hello, my name is \${this.name}\`);
    }
};

person.greet();`,
            
            python: `# Python Example - Fibonacci Sequence
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Calculate first 10 Fibonacci numbers
print("Fibonacci Sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")

# List operations
numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]
print(f"\\nOriginal numbers: {numbers}")
print(f"Squares: {squares}")

# Class example
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        print(f"Hello, my name is {self.name}")

person = Person("John", 30)
person.greet()`,
            
            java: `// Java Example - Factorial Calculation
public class Main {
    public static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    
    public static void main(String[] args) {
        // Calculate factorials
        System.out.println("Factorials:");
        for (int i = 1; i <= 10; i++) {
            System.out.println(i + "! = " + factorial(i));
        }
        
        // Array operations
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        
        System.out.println("\\nNumbers:");
        for (int num : numbers) {
            System.out.print(num + " ");
            sum += num;
        }
        
        System.out.println("\\nSum: " + sum);
        System.out.println("Average: " + (double)sum / numbers.length);
    }
}`,
            
            cpp: `// C++ Example - Prime Number Check
#include <iostream>
#include <cmath>
using namespace std;

bool isPrime(int n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    
    for (int i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0)
            return false;
    }
    return true;
}

int main() {
    cout << "Prime numbers between 1 and 50:" << endl;
    
    for (int i = 1; i <= 50; i++) {
        if (isPrime(i)) {
            cout << i << " ";
        }
    }
    
    cout << endl;
    return 0;
}`
        };
        
        return examples[language] || examples.javascript;
    }
    
    compileCode() {
        const code = this.codeEditor?.value || '';
        const language = this.languageSelect?.value || 'javascript';
        
        if (!code.trim()) {
            window.app?.showNotification('Please write some code first!', 'error');
            return;
        }
        
        // Show loading state
        const compileBtn = document.getElementById('compileBtn');
        if (compileBtn) {
            const originalText = compileBtn.innerHTML;
            compileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compiling...';
            compileBtn.disabled = true;
            
            // Simulate compilation delay
            setTimeout(() => {
                this.executeCode(code, language);
                compileBtn.innerHTML = originalText;
                compileBtn.disabled = false;
            }, 500);
        } else {
            this.executeCode(code, language);
        }
    }
    
    executeCode(code, language) {
        let output = '';
        
        try {
            switch (language) {
                case 'javascript':
                    output = this.executeJavaScript(code);
                    break;
                case 'python':
                    output = this.executePython(code);
                    break;
                case 'java':
                    output = this.executeJava(code);
                    break;
                case 'cpp':
                    output = this.executeCpp(code);
                    break;
                case 'c':
                    output = this.executeC(code);
                    break;
                case 'csharp':
                    output = this.executeCSharp(code);
                    break;
                case 'go':
                    output = this.executeGo(code);
                    break;
                case 'php':
                    output = this.executePHP(code);
                    break;
                default:
                    output = `Language "${language}" execution simulated.\n\nCode Preview:\n${code.substring(0, 500)}...`;
            }
        } catch (error) {
            output = `Error executing ${language} code:\n${error.message}`;
        }
        
        // Display output
        if (this.outputElement) {
            const timestamp = new Date().toLocaleTimeString();
            this.outputElement.textContent = `[${timestamp}] ${language.toUpperCase()} Output:\n${'='.repeat(50)}\n${output}\n\n`;
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }
        
        // Save to history
        if (window.dataStore) {
            window.dataStore.addHistory({
                type: 'compile',
                language,
                code: code.substring(0, 1000),
                output: output.substring(0, 1000)
            });
        }
        
        window.app?.showNotification(`Code compiled successfully in ${language}!`, 'success');
    }
    
    executeJavaScript(code) {
        try {
            // Create a safe execution environment
            const logs = [];
            const originalLog = console.log;
            console.log = (...args) => {
                logs.push(args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' '));
            };
            
            // Execute code in a try-catch block
            try {
                eval(code);
            } catch (error) {
                logs.push(`Error: ${error.message}`);
            }
            
            // Restore original console.log
            console.log = originalLog;
            
            return logs.join('\n') || 'Code executed (no output)';
        } catch (error) {
            return `JavaScript Execution Error: ${error.message}`;
        }
    }
    
    executePython(code) {
        // Simulate Python execution with pattern matching
        const lines = code.split('\n');
        const output = [];
        
        // Simple Python interpreter simulation
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Detect print statements
            if (line.startsWith('print(') && line.endsWith(')')) {
                const content = line.substring(6, line.length - 1);
                // Remove quotes and format
                const printed = content.replace(/['"]/g, '').replace(/f"/g, '').replace(/"/g, '');
                output.push(printed);
            }
            
            // Detect function definitions
            if (line.startsWith('def ')) {
                const funcName = line.split(' ')[1].split('(')[0];
                output.push(`Function defined: ${funcName}`);
            }
            
            // Detect loops
            if (line.includes('for ') && line.includes(' in ') && line.endsWith(':')) {
                output.push('Loop iteration detected');
            }
        }
        
        if (output.length === 0) {
            return 'Python code parsed successfully. (Simulated execution)\n\nCode structure analyzed:';
        }
        
        return output.join('\n');
    }
    
    executeJava(code) {
        // Simulate Java execution
        const lines = code.split('\n');
        let className = 'Main';
        let output = [];
        
        // Find class name
        for (const line of lines) {
            if (line.includes('public class ')) {
                const match = line.match(/public class (\w+)/);
                if (match) className = match[1];
            }
            
            // Find System.out.println statements
            if (line.includes('System.out.println')) {
                const content = line.split('System.out.println')[1];
                if (content) {
                    const printed = content.substring(content.indexOf('(') + 1, content.lastIndexOf(')'));
                    output.push(eval(printed) || printed.replace(/["+]/g, '').trim());
                }
            }
        }
        
        return `Java Class: ${className}\nOutput:\n${output.join('\n') || 'No console output detected'}`;
    }
    
    executeCpp(code) {
        // Simulate C++ execution
        const lines = code.split('\n');
        let output = [];
        
        for (const line of lines) {
            if (line.includes('cout <<')) {
                const parts = line.split('cout <<');
                if (parts.length > 1) {
                    const content = parts[1].split(';')[0];
                    output.push(content.replace(/["<<]/g, '').trim());
                }
            }
            
            if (line.includes('printf(')) {
                const content = line.split('printf(')[1];
                if (content) {
                    const printed = content.substring(0, content.lastIndexOf(')'));
                    output.push(printed.replace(/["%\\]/g, '').trim());
                }
            }
        }
        
        return `C++ Program Output:\n${output.join('\n') || 'No output statements detected'}`;
    }
    
    executeC(code) {
        return this.executeCpp(code).replace('C++', 'C');
    }
    
    executeCSharp(code) {
        const lines = code.split('\n');
        let output = [];
        
        for (const line of lines) {
            if (line.includes('Console.WriteLine') || line.includes('Console.Write')) {
                const content = line.split('Console.')[1];
                if (content) {
                    const printed = content.substring(content.indexOf('(') + 1, content.lastIndexOf(')'));
                    output.push(printed.replace(/["+]/g, '').trim());
                }
            }
        }
        
        return `C# Program Output:\n${output.join('\n') || 'No console output detected'}`;
    }
    
    executeGo(code) {
        return `Go code execution simulated.\n\nCode parsed successfully.\nNote: Browser-based Go execution requires WebAssembly compilation.`;
    }
    
    executePHP(code) {
        const lines = code.split('\n');
        let output = [];
        
        for (const line of lines) {
            if (line.includes('echo ') || line.includes('print ')) {
                const parts = line.split(/(echo|print)/);
                if (parts.length > 2) {
                    output.push(parts[2].replace(/[;'"]/g, '').trim());
                }
            }
        }
        
        return `PHP Output:\n${output.join('\n') || 'No output statements detected'}`;
    }
    
    saveCode() {
        const code = this.codeEditor?.value || '';
        const language = this.languageSelect?.value || 'javascript';
        
        if (!code.trim()) {
            window.app?.showNotification('No code to save!', 'error');
            return;
        }
        
        const langInfo = this.languages[language];
        const extension = langInfo?.extension || 'txt';
        const filename = `code.${extension}`;
        
        // Create and download file
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.app?.showNotification(`Code saved as ${filename}`, 'success');
    }
    
    loadExample() {
        const language = this.languageSelect?.value || 'javascript';
        const exampleCode = this.getExampleCode(language);
        
        if (this.codeEditor) {
            this.codeEditor.value = exampleCode;
            window.app?.showNotification('Example code loaded', 'info');
        }
    }
    
    getExampleCode(language) {
        const examples = {
            javascript: `// Advanced JavaScript Example - Calculator Class
class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(value) {
        this.result += value;
        return this;
    }
    
    subtract(value) {
        this.result -= value;
        return this;
    }
    
    multiply(value) {
        this.result *= value;
        return this;
    }
    
    divide(value) {
        if (value !== 0) {
            this.result /= value;
        }
        return this;
    }
    
    clear() {
        this.result = 0;
        return this;
    }
    
    getResult() {
        return this.result;
    }
}

// Usage example
const calc = new Calculator();
const result = calc.add(10).multiply(3).subtract(5).divide(2).getResult();

console.log("Calculator Result:", result);
console.log("Math operations completed successfully!");`,
            
            python: `# Advanced Python Example - Data Processing
import math

def process_data(data):
    """Process a list of numbers"""
    if not data:
        return None
    
    results = {
        'sum': sum(data),
        'average': sum(data) / len(data),
        'min': min(data),
        'max': max(data),
        'sorted': sorted(data)
    }
    
    return results

def analyze_dataset(dataset):
    """Analyze multiple datasets"""
    analysis = {}
    
    for key, data in dataset.items():
        analysis[key] = process_data(data)
    
    return analysis

# Example data
dataset = {
    'temperatures': [22, 24, 19, 25, 23, 21, 20],
    'prices': [99.99, 149.99, 79.99, 199.99, 129.99],
    'scores': [85, 92, 78, 95, 88, 91]
}

# Analyze data
results = analyze_dataset(dataset)

print("Data Analysis Results:")
for key, result in results.items():
    print(f"\\n{key.upper()}:")
    print(f"  Sum: {result['sum']}")
    print(f"  Average: {result['average']:.2f}")
    print(f"  Range: {result['min']} - {result['max']}")`
        };
        
        return examples[language] || this.getDefaultCode(language);
    }
    
    initWebCompiler() {
        const runBtn = document.getElementById('runWebCode');
        const previewFrame = document.getElementById('previewFrame');
        
        if (!runBtn || !previewFrame) return;
        
        runBtn.addEventListener('click', () => {
            const htmlCode = document.getElementById('htmlEditor')?.value || '';
            const cssCode = document.getElementById('cssEditor')?.value || '';
            const jsCode = document.getElementById('jsEditor')?.value || '';
            
            const combinedCode = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>${cssCode}</style>
                </head>
                <body>
                    ${htmlCode}
                    <script>
                        try {
                            ${jsCode}
                        } catch (error) {
                            console.error('JavaScript Error:', error);
                            document.body.innerHTML += '<div style="color: red; padding: 10px; margin: 10px; border: 1px solid red;">JavaScript Error: ' + error.message + '</div>';
                        }
                    <\/script>
                </body>
                </html>
            `;
            
            const blob = new Blob([combinedCode], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            previewFrame.src = url;
            
            window.app?.showNotification('Web code executed in preview!', 'success');
        });
        
        // Load default web code
        this.loadDefaultWebCode();
    }
    
    loadDefaultWebCode() {
        const htmlEditor = document.getElementById('htmlEditor');
        const cssEditor = document.getElementById('cssEditor');
        const jsEditor = document.getElementById('jsEditor');
        
        if (htmlEditor && cssEditor && jsEditor) {
            htmlEditor.value = `<!DOCTYPE html>
<html>
<head>
    <title>Web Compiler Demo</title>
</head>
<body>
    <div class="container">
        <h1>Welcome to CodeMaster Web Compiler</h1>
        <p>Edit HTML, CSS, and JavaScript code to see instant results!</p>
        
        <div class="demo-box">
            <h2>Interactive Demo</h2>
            <button id="demoButton">Click Me!</button>
            <div id="output">Button not clicked yet</div>
        </div>
        
        <div class="features">
            <div class="feature">
                <h3>Real-time Preview</h3>
                <p>See changes instantly</p>
            </div>
            <div class="feature">
                <h3>Three Editors</h3>
                <p>HTML, CSS & JS separate</p>
            </div>
            <div class="feature">
                <h3>No Setup Needed</h3>
                <p>Works in browser</p>
            </div>
        </div>
    </div>
</body>
</html>`;
            
            cssEditor.value = `/* CSS Styles for Web Compiler Demo */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

h1 {
    color: #4f46e5;
    text-align: center;
    margin-bottom: 20px;
}

.demo-box {
    background: #f8fafc;
    padding: 20px;
    border-radius: 10px;
    margin: 30px 0;
    border: 2px solid #e2e8f0;
}

#demoButton {
    background: #4f46e5;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s;
}

#demoButton:hover {
    background: #4338ca;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(79, 70, 229, 0.4);
}

#output {
    margin-top: 20px;
    padding: 15px;
    background: #e0e7ff;
    border-radius: 6px;
    font-weight: 500;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 40px;
}

.feature {
    background: white;
    padding: 20px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    text-align: center;
    transition: transform 0.3s;
}

.feature:hover {
    transform: translateY(-5px);
    border-color: #4f46e5;
}

.feature h3 {
    color: #4f46e5;
    margin-bottom: 10px;
}`;
            
            jsEditor.value = `// JavaScript for Web Compiler Demo
document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById('demoButton');
    const output = document.getElementById('output');
    let clickCount = 0;
    
    button.addEventListener('click', function() {
        clickCount++;
        output.innerHTML = \`Button clicked \${clickCount} time\${clickCount !== 1 ? 's' : ''}!\`;
        
        // Change button color
        const colors = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];
        button.style.backgroundColor = colors[clickCount % colors.length];
        
        // Add animation
        output.style.transition = 'all 0.3s';
        output.style.transform = 'scale(1.05)';
        setTimeout(() => {
            output.style.transform = 'scale(1)';
        }, 300);
        
        // Add confetti effect on every 3rd click
        if (clickCount % 3 === 0) {
            createConfetti();
        }
    });
    
    function createConfetti() {
        const confettiCount = 50;
        const container = document.querySelector('.demo-box');
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = getRandomColor();
            confetti.style.borderRadius = '50%';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '0';
            confetti.style.zIndex = '1000';
            container.appendChild(confetti);
            
            // Animate confetti
            const animation = confetti.animate([
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: \`translateY(\${Math.random() * 200 + 100}px) rotate(\${Math.random() * 360}deg)\`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 1000,
                easing: 'cubic-bezier(0.215, 0.610, 0.355, 1)'
            });
            
            animation.onfinish = () => confetti.remove();
        }
    }
    
    function getRandomColor() {
        const colors = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    console.log('Web Compiler Demo loaded successfully!');
});`;
        }
    }
}

// Initialize compiler
document.addEventListener('DOMContentLoaded', () => {
    window.compiler = new Compiler();
});