// Language Converter - No APIs, pure browser-based conversion
class LanguageConverter {
    constructor() {
        this.languages = [
            'javascript', 'python', 'java', 'cpp', 'c', 
            'csharp', 'go', 'rust', 'php', 'swift'
        ];
        
        this.conversionRules = this.buildConversionRules();
        this.init();
    }
    
    init() {
        this.initEditors();
        this.initEventListeners();
        this.loadDefaultExample();
        this.initConversionMatrix();
    }
    
    initEditors() {
        this.inputEditor = document.getElementById('inputCode');
        this.outputEditor = document.getElementById('outputCode');
        this.fromLang = document.getElementById('fromLang');
        this.toLang = document.getElementById('toLang');
        
        // Add tab support to editors
        [this.inputEditor, this.outputEditor].forEach(editor => {
            if (editor) {
                editor.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        const start = editor.selectionStart;
                        const end = editor.selectionEnd;
                        
                        editor.value = editor.value.substring(0, start) + 
                            '    ' + editor.value.substring(end);
                        
                        editor.selectionStart = editor.selectionEnd = start + 4;
                    }
                });
            }
        });
    }
    
    initEventListeners() {
        // Convert button
        document.getElementById('convertBtn')?.addEventListener('click', () => this.convertCode());
        
        // Swap languages
        document.getElementById('swapLanguages')?.addEventListener('click', () => this.swapLanguages());
        
        // Copy output
        document.getElementById('copyOutput')?.addEventListener('click', () => this.copyOutput());
        
        // Clear all
        document.getElementById('clearAll')?.addEventListener('click', () => this.clearAll());
        
        // Save converted code
        document.getElementById('saveConverted')?.addEventListener('click', () => this.saveConvertedCode());
        
        // Example buttons
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fromLang = e.target.getAttribute('data-from');
                const toLang = e.target.getAttribute('data-to');
                this.loadExample(fromLang, toLang);
            });
        });
    }
    
    buildConversionRules() {
        return {
            'javascript-python': {
                patterns: [
                    { from: /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, to: 'def $1($2):' },
                    { from: /console\.log/g, to: 'print' },
                    { from: /const\s+|let\s+|var\s+/g, to: '' },
                    { from: /;\s*$/gm, to: '' },
                    { from: /\}\s*$/gm, to: '' },
                    { from: /\{/g, to: '' },
                    { from: /\/\/ /g, to: '# ' },
                    { from: /Math\.PI/g, to: 'math.pi' },
                    { from: /Math\.sqrt/g, to: 'math.sqrt' },
                    { from: /\.map\(/g, to: ' list(map(' },
                    { from: /\.filter\(/g, to: ' list(filter(' },
                    { from: /=>/g, to: 'lambda ' },
                    { from: /`([^`]+)`/g, to: 'f"$1"' },
                    { from: /===/g, to: '==' },
                    { from: /!==/g, to: '!=' },
                    { from: /null/g, to: 'None' },
                    { from: /true/g, to: 'True' },
                    { from: /false/g, to: 'False' },
                    { from: /&&/g, to: 'and' },
                    { from: /\|\|/g, to: 'or' },
                    { from: /\.length/g, to: 'len()' },
                    { from: /\.push\(/g, to: '.append(' },
                    { from: /\.pop\(\)/g, to: '.pop()' }
                ],
                postProcess: (code) => {
                    // Add import if needed
                    if (code.includes('math.')) {
                        code = 'import math\n' + code;
                    }
                    return code;
                }
            },
            
            'python-javascript': {
                patterns: [
                    { from: /def\s+(\w+)\s*\(([^)]*)\):/g, to: 'function $1($2) {' },
                    { from: /print\(/g, to: 'console.log(' },
                    { from: /\bself\./g, to: 'this.' },
                    { from: /:\s*$/gm, to: ' {' },
                    { from: /^(\s*)(\w+)\s*=\s*/gm, to: '$1let $2 = ' },
                    { from: /# /g, to: '// ' },
                    { from: /math\.pi/g, to: 'Math.PI' },
                    { from: /math\.sqrt/g, to: 'Math.sqrt' },
                    { from: /\blen\(/g, to: '.length' },
                    { from: /f"([^"]+)"/g, to: '`$1`' },
                    { from: /\.append\(/g, to: '.push(' },
                    { from: /\.pop\(\)/g, to: '.pop()' },
                    { from: /None/g, to: 'null' },
                    { from: /True/g, to: 'true' },
                    { from: /False/g, to: 'false' },
                    { from: /and/g, to: '&&' },
                    { from: /or/g, to: '||' },
                    { from: /not /g, to: '! ' }
                ],
                postProcess: (code) => {
                    // Close braces
                    const lines = code.split('\n');
                    let indent = 0;
                    const result = [];
                    
                    for (let line of lines) {
                        const trimmed = line.trim();
                        
                        // Decrease indent when line doesn't end with {
                            if (!trimmed.endsWith('{') && line.includes('}')) {
                            indent = Math.max(0, indent - 1);
                        }
                        
                        // Add indentation
                        result.push('    '.repeat(indent) + line.trimStart());
                        
                        // Increase indent for next line if this line ends with {
                            if (trimmed.endsWith('{')) {
                            indent++;
                        }
                    }
                    
                    return result.join('\n');
                }
            },
            
            'java-cpp': {
                patterns: [
                    { from: /public class/g, to: 'class' },
                    { from: /System\.out\.println/g, to: 'std::cout <<' },
                    { from: /System\.out\.print/g, to: 'std::cout <<' },
                    { from: /String\[\]/g, to: 'std::vector<std::string>' },
                    { from: /int\[\]/g, to: 'std::vector<int>' },
                    { from: /\.length/g, to: '.size()' },
                    { from: /ArrayList</g, to: 'std::vector<' },
                    { from: /" \+ /g, to: '" << ' },
                    { from: /public static void main/g, to: 'int main' },
                    { from: /String args\[\]/g, to: '' },
                    { from: /void /g, to: '' },
                    { from: /new (.*?)\(\)/g, to: '$1()' },
                    { from: /\.equals\(/g, to: ' == ' }
                ],
                postProcess: (code) => {
                    // Add C++ headers
                    if (code.includes('std::')) {
                        code = '#include <iostream>\n#include <vector>\n#include <string>\n\n' + code;
                    }
                    return code;
                }
            },
            
            'cpp-java': {
                patterns: [
                    { from: /std::cout\s*<</g, to: 'System.out.print' },
                    { from: /std::endl/g, to: '"\\n"' },
                    { from: /std::vector<([^>]+)>/g, to: '$1[]' },
                    { from: /\.size\(\)/g, to: '.length' },
                    { from: /#include <[^>]+>/g, to: '' },
                    { from: /using namespace std;/g, to: '' },
                    { from: /int main\(\)/g, to: 'public static void main(String[] args)' },
                    { from: /cout\s*<</g, to: 'System.out.print' },
                    { from: /cin\s*>>/g, to: 'scanner.next' },
                    { from: /endl/g, to: '"\\n"' },
                    { from: /\.push_back\(/g, to: '.add(' },
                    { from: /\.pop_back\(\)/g, to: '.removeLast()' }
                ],
                postProcess: (code) => {
                    // Wrap in class
                    if (!code.includes('class ') && code.includes('public static void main')) {
                        code = 'public class Main {\n' + code + '\n}';
                    }
                    return code;
                }
            }
        };
    }
    
    loadDefaultExample() {
        const defaultCode = `// JavaScript to Python Conversion Example
function calculateCircleArea(radius) {
    return Math.PI * radius * radius;
}

function isPrime(num) {
    if (num <= 1) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) return false;
    }
    return true;
}

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const primes = numbers.filter(isPrime);
const areas = numbers.map(calculateCircleArea);

console.log("Prime numbers:", primes);
console.log("Circle areas:", areas);`;
        
        if (this.inputEditor) {
            this.inputEditor.value = defaultCode;
        }
    }
    
    convertCode() {
        const code = this.inputEditor?.value || '';
        const fromLang = this.fromLang?.value || 'javascript';
        const toLang = this.toLang?.value || 'python';
        
        if (!code.trim()) {
            window.app?.showNotification('Please enter some code to convert!', 'error');
            return;
        }
        
        if (fromLang === toLang) {
            window.app?.showNotification('Source and target languages are the same!', 'warning');
            return;
        }
        
        // Show loading state
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {
            const originalText = convertBtn.innerHTML;
            convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
            convertBtn.disabled = true;
            
            // Simulate conversion delay
            setTimeout(() => {
                this.performConversion(code, fromLang, toLang);
                convertBtn.innerHTML = originalText;
                convertBtn.disabled = false;
            }, 800);
        } else {
            this.performConversion(code, fromLang, toLang);
        }
    }
    
    performConversion(code, fromLang, toLang) {
        const conversionKey = `${fromLang}-${toLang}`;
        const rules = this.conversionRules[conversionKey];
        
        let convertedCode = code;
        let notes = [];
        
        if (rules) {
            // Apply pattern conversions
            rules.patterns.forEach(pattern => {
                convertedCode = convertedCode.replace(pattern.from, pattern.to);
            });
            
            // Apply post-processing
            if (rules.postProcess) {
                convertedCode = rules.postProcess(convertedCode);
            }
            
            notes.push(`Applied ${rules.patterns.length} conversion patterns`);
        } else {
            // Fallback: basic syntax conversion
            convertedCode = this.fallbackConversion(code, fromLang, toLang);
            notes.push('Used basic syntax conversion (manual review recommended)');
        }
        
        // Add conversion header
        const timestamp = new Date().toLocaleString();
        const header = `// Converted from ${fromLang} to ${toLang}
// Date: ${timestamp}
// Notes: ${notes.join(', ')}
// ============================================

`;
        
        convertedCode = header + convertedCode;
        
        // Update output editor
        if (this.outputEditor) {
            this.outputEditor.value = convertedCode;
            this.outputEditor.scrollTop = 0;
        }
        
        // Save to history
        if (window.dataStore) {
            window.dataStore.addHistory({
                type: 'convert',
                fromLang,
                toLang,
                originalCode: code.substring(0, 1000),
                convertedCode: convertedCode.substring(0, 1000)
            });
        }
        
        window.app?.showNotification(`Code converted from ${fromLang} to ${toLang}!`, 'success');
    }
    
    fallbackConversion(code, fromLang, toLang) {
        // Basic fallback conversion rules
        let converted = code;
        
        // Common pattern replacements
        const commonReplacements = [
            // Comments
            { from: /\/\//g, to: '#' },
            { from: /#/g, to: '//' },
            
            // Booleans
            { from: /true/g, to: 'True' },
            { from: /false/g, to: 'False' },
            { from: /True/g, to: 'true' },
            { from: /False/g, to: 'false' },
            { from: /null/g, to: 'None' },
            { from: /None/g, to: 'null' },
            
            // Operators
            { from: /===/g, to: '==' },
            { from: /!==/g, to: '!=' },
            { from: /&&/g, to: 'and' },
            { from: /\|\|/g, to: 'or' },
            { from: /!/g, to: 'not ' },
            
            // Print/Log statements
            { from: /console\.log/g, to: 'print' },
            { from: /System\.out\.println/g, to: 'print' },
            { from: /print\(/g, to: 'console.log(' }
        ];
        
        commonReplacements.forEach(replacement => {
            converted = converted.replace(replacement.from, replacement.to);
        });
        
        return `// Basic conversion from ${fromLang} to ${toLang}
// Note: This is a simple conversion. Manual adjustments are needed.
// Review the logic and adjust syntax for ${toLang} conventions.

${converted}`;
    }
    
    swapLanguages() {
        const fromLang = this.fromLang.value;
        const toLang = this.toLang.value;
        
        // Swap selections
        this.fromLang.value = toLang;
        this.toLang.value = fromLang;
        
        // Swap code if output has content
        const outputCode = this.outputEditor?.value || '';
        if (outputCode && !outputCode.includes('Converted code will appear here')) {
            const inputCode = this.inputEditor?.value || '';
            this.inputEditor.value = outputCode;
            this.outputEditor.value = inputCode;
        }
        
        window.app?.showNotification('Languages swapped!', 'info');
    }
    
    copyOutput() {
        const code = this.outputEditor?.value || '';
        
        if (!code.trim() || code.includes('Converted code will appear here')) {
            window.app?.showNotification('No converted code to copy!', 'error');
            return;
        }
        
        navigator.clipboard.writeText(code).then(() => {
            window.app?.showNotification('Code copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            window.app?.showNotification('Failed to copy. Please select and copy manually.', 'error');
        });
    }
    
    clearAll() {
        if (confirm('Clear all code from both editors?')) {
            if (this.inputEditor) this.inputEditor.value = '';
            if (this.outputEditor) this.outputEditor.value = '';
            window.app?.showNotification('All code cleared!', 'info');
        }
    }
    
    saveConvertedCode() {
        const code = this.outputEditor?.value || '';
        const toLang = this.toLang?.value || 'python';
        
        if (!code.trim() || code.includes('Converted code will appear here')) {
            window.app?.showNotification('No converted code to save!', 'error');
            return;
        }
        
        const extensions = {
            'javascript': 'js',
            'python': 'py',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'csharp': 'cs',
            'go': 'go',
            'rust': 'rs',
            'php': 'php',
            'swift': 'swift'
        };
        
        const extension = extensions[toLang] || 'txt';
        const filename = `converted_code.${extension}`;
        
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.app?.showNotification(`Converted code saved as ${filename}!`, 'success');
    }
    
    loadExample(fromLang, toLang) {
        const examples = {
            'javascript-python': {
                title: 'JavaScript to Python - Array Operations',
                code: `// JavaScript array operations
const numbers = [1, 2, 3, 4, 5];

// Map: Square each number
const squares = numbers.map(n => n * n);

// Filter: Get even numbers
const evens = numbers.filter(n => n % 2 === 0);

// Reduce: Calculate sum
const sum = numbers.reduce((total, num) => total + num, 0);

// ForEach: Print each number
numbers.forEach(n => console.log(n));

console.log("Squares:", squares);
console.log("Evens:", evens);
console.log("Sum:", sum);`
            },
            'python-javascript': {
                title: 'Python to JavaScript - List Comprehensions',
                code: `# Python list comprehensions and functions
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# List comprehension: Squares of even numbers
even_squares = [n**2 for n in numbers if n % 2 == 0]

# Function with default parameter
def greet(name="Guest", times=1):
    for _ in range(times):
        print(f"Hello, {name}!")

# Dictionary comprehension
square_dict = {n: n**2 for n in numbers}

# Lambda function
add = lambda x, y: x + y

print("Even squares:", even_squares)
print("Square dictionary:", square_dict)
print("Add 5 + 3:", add(5, 3))
greet("Alice", 2)`
            },
            'java-cpp': {
                title: 'Java to C++ - Class Conversion',
                code: `// Java class example
public class Calculator {
    private double result;
    
    public Calculator() {
        this.result = 0;
    }
    
    public void add(double value) {
        this.result += value;
    }
    
    public void subtract(double value) {
        this.result -= value;
    }
    
    public void multiply(double value) {
        this.result *= value;
    }
    
    public void divide(double value) {
        if (value != 0) {
            this.result /= value;
        }
    }
    
    public double getResult() {
        return this.result;
    }
    
    public static void main(String[] args) {
        Calculator calc = new Calculator();
        calc.add(10.5);
        calc.multiply(2);
        calc.subtract(5.25);
        calc.divide(3);
        
        System.out.println("Result: " + calc.getResult());
    }
}`
            },
            'cpp-java': {
                title: 'C++ to Java - Vector Operations',
                code: `// C++ vector operations
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> numbers = {5, 2, 8, 1, 9, 3, 7, 4, 6, 10};
    
    // Sort vector
    std::sort(numbers.begin(), numbers.end());
    
    // Find element
    auto it = std::find(numbers.begin(), numbers.end(), 7);
    if (it != numbers.end()) {
        std::cout << "Found 7 at position: " << (it - numbers.begin()) << std::endl;
    }
    
    // Remove elements less than 5
    numbers.erase(std::remove_if(numbers.begin(), numbers.end(), 
        [](int n) { return n < 5; }), numbers.end());
    
    // Print all elements
    std::cout << "Numbers (>=5): ";
    for (int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    
    return 0;
}`
            }
        };
        
        const exampleKey = `${fromLang}-${toLang}`;
        const example = examples[exampleKey];
        
        if (example && this.inputEditor) {
            this.inputEditor.value = example.code;
            this.fromLang.value = fromLang;
            this.toLang.value = toLang;
            
            // Clear output
            if (this.outputEditor) {
                this.outputEditor.value = '';
            }
            
            window.app?.showNotification(`Loaded "${example.title}" example`, 'info');
        }
    }
    
    initConversionMatrix() {
        const matrix = document.querySelector('.conversion-matrix');
        if (!matrix) return;
        
        // Populate conversion matrix with actual capabilities
        const supportedConversions = [
            'javascript-python', 'python-javascript',
            'java-cpp', 'cpp-java',
            'javascript-java', 'java-javascript',
            'python-cpp', 'cpp-python'
        ];
        
        // This would be populated based on actual capabilities
        // For now, we'll just show the static matrix
    }
}

// Initialize converter
document.addEventListener('DOMContentLoaded', () => {
    window.converter = new LanguageConverter();
});