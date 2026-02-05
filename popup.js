class JSONFormatter {
    constructor() {
        // 获取DOM元素
        this.jsonInput = document.getElementById('json-input');
        this.jsonOutput = document.getElementById('json-output');
        this.formatBtn = document.getElementById('format-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.pasteBtn = document.getElementById('paste-btn');
        this.minifyBtn = document.getElementById('minify-btn');
        this.validateBtn = document.getElementById('validate-btn');
        this.openTabBtn = document.getElementById('open-tab-btn');
        this.status = document.getElementById('status');
        this.autoFormatCheckbox = document.getElementById('auto-format');
        this.loadExampleBtn = document.getElementById('load-example');
        
        this.init();
    }

    init() {
        // 绑定事件监听器
        this.formatBtn.addEventListener('click', () => this.formatJSON());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.minifyBtn.addEventListener('click', () => this.minifyJSON());
        this.validateBtn.addEventListener('click', () => this.validateJSON());
        this.openTabBtn.addEventListener('click', () => this.openInTab());
        
        if (this.loadExampleBtn) {
            this.loadExampleBtn.addEventListener('click', () => this.loadExample());
        }
        
        // 粘贴时自动格式化
        this.jsonInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                if (this.autoFormatCheckbox.checked) {
                    this.formatJSON();
                }
            }, 10);
        });
        
        // 保存自动格式化设置
        this.autoFormatCheckbox.addEventListener('change', function() {
            try {
                chrome.storage.local.set({ autoFormat: this.checked });
            } catch (error) {
                console.error('保存设置失败:', error);
            }
        });
        
        // 加载保存的设置和历史记录
        this.loadSettings();
    }

    // ==================== JSON解析和转换核心方法 ====================
    
    parseEnhancedJSON(str) {
        try {
            // 首先尝试标准JSON解析
            return JSON.parse(str);
        } catch (standardError) {
            try {
                // 处理JavaScript对象字面量
                let processed = this.convertJsObjectToJson(str);
                return JSON.parse(processed);
            } catch (jsError) {
                throw new Error(`JSON解析失败:\n标准JSON错误: ${standardError.message}\nJS对象转换错误: ${jsError.message}`);
            }
        }
    }

    convertJsObjectToJson(jsString) {
        let str = jsString.trim();
        
        // 1. 移除变量声明和分号
        str = str.replace(/^(var|let|const|function|return|export\s+default)\s+[^{]*=/, '');
        str = str.replace(/;[^}]*$/, '');
        
        // 2. 找到第一个 { 或 [ 开始的位置
        const startMatch = str.match(/[{\[]/);
        if (!startMatch) {
            throw new Error('未找到有效的JSON对象或数组起始符');
        }
        
        const startIndex = str.indexOf(startMatch[0]);
        if (startIndex > 0) {
            str = str.substring(startIndex);
        }
        
        // 3. 找到最后一个匹配的 } 或 ]
        let braceCount = 0;
        let bracketCount = 0;
        let endIndex = -1;
        let inString = false;
        let currentQuote = '';
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const prevChar = i > 0 ? str[i - 1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    currentQuote = char;
                } else if (char === currentQuote) {
                    inString = false;
                    currentQuote = '';
                }
            }
            
            if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                else if (char === '[') bracketCount++;
                else if (char === ']') bracketCount--;
                
                if (braceCount === 0 && bracketCount === 0) {
                    endIndex = i;
                }
            }
        }
        
        if (endIndex !== -1 && endIndex < str.length - 1) {
            str = str.substring(0, endIndex + 1);
        }
        
        // 4. 转换单引号字符串为双引号字符串
        str = this.convertSingleQuotes(str);
        
        // 5. 给属性名添加双引号
        str = this.quotePropertyNames(str);
        
        return str;
    }

    convertSingleQuotes(str) {
        let result = '';
        let inString = false;
        let quoteType = '';
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const prevChar = i > 0 ? str[i - 1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    quoteType = char;
                    result += '"';
                } else if (char === quoteType) {
                    inString = false;
                    quoteType = '';
                    result += '"';
                } else {
                    result += char;
                }
            } else {
                result += char;
            }
        }
        
        return result;
    }

    quotePropertyNames(str) {
        let result = '';
        let inString = false;
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const prevChar = i > 0 ? str[i - 1] : '';
            
            if (char === '"' && prevChar !== '\\') {
                inString = !inString;
                result += char;
                continue;
            }
            
            if (!inString && (char === '{' || char === ',')) {
                result += char;
                
                let j = i + 1;
                while (j < str.length && /\s/.test(str[j])) {
                    result += str[j];
                    j++;
                }
                
                if (j < str.length && /[a-zA-Z_$]/.test(str[j])) {
                    let propName = '';
                    let k = j;
                    while (k < str.length && /[a-zA-Z0-9_$]/.test(str[k])) {
                        propName += str[k];
                        k++;
                    }
                    
                    let l = k;
                    while (l < str.length && /\s/.test(str[l])) {
                        l++;
                    }
                    
                    if (l < str.length && str[l] === ':') {
                        result += '"' + propName + '"';
                        i = k - 1;
                        continue;
                    }
                }
            } else {
                result += char;
            }
        }
        
        return result;
    }

    // ==================== 主要功能方法 ====================

    formatJSON() {
        try {
            const input = this.jsonInput.value.trim();
            if (!input) {
                this.showStatus('请输入JSON字符串', 'error');
                return;
            }

            let parsed = this.parseEnhancedJSON(input);
            const formatted = JSON.stringify(parsed, null, 4);
            this.jsonOutput.textContent = formatted;
            this.syntaxHighlight(formatted);
            this.showStatus('格式化成功', 'success');
            
            // 保存到存储
            this.saveToStorage('lastInput', input);
            this.saveToStorage('lastFormatted', formatted);
            
            // 发送到Tab页（如果已打开）
            this.shareWithTab(input);
        } catch (error) {
            this.showStatus(error.message, 'error');
            this.jsonOutput.textContent = error.message;
        }
    }

    syntaxHighlight(json) {
        if (!json || json.includes('错误') || json.includes('无法解析')) {
            this.jsonOutput.textContent = json;
            return;
        }
        
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
            let cls = 'json-key';
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else if (/^"/.test(match)) {
                if (/:$/.test(match.replace(/"[^"]*"/g, ''))) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            }
            return '<span class="' + cls + '">' + match + '</span>';
        })
        .replace(/\b(true|false|null)\b/g, '<span class="json-boolean">$1</span>')
        .replace(/\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g, '<span class="json-number">$&</span>');
        
        this.jsonOutput.innerHTML = json;
    }

    minifyJSON() {
        try {
            const input = this.jsonInput.value.trim();
            if (!input) {
                this.showStatus('请输入JSON字符串', 'error');
                return;
            }

            const parsed = this.parseEnhancedJSON(input);
            const minified = JSON.stringify(parsed);
            this.jsonOutput.textContent = minified;
            this.syntaxHighlight(minified);
            this.showStatus('压缩成功', 'success');
        } catch (error) {
            this.showStatus('错误: ' + error.message, 'error');
        }
    }

    validateJSON() {
        try {
            const input = this.jsonInput.value.trim();
            if (!input) {
                this.showStatus('请输入JSON字符串', 'error');
                return;
            }

            const parsed = this.parseEnhancedJSON(input);
            const isValid = typeof parsed === 'object' && parsed !== null;
            
            if (isValid) {
                this.showStatus('✓ JSON格式正确', 'success');
                this.jsonOutput.textContent = '验证结果: 格式正确\n\n' + JSON.stringify(parsed, null, 2);
                this.syntaxHighlight(this.jsonOutput.textContent);
            } else {
                this.showStatus('JSON格式不正确', 'error');
            }
        } catch (error) {
            this.showStatus('JSON格式错误: ' + error.message, 'error');
        }
    }

    async copyToClipboard() {
        const text = this.jsonOutput.textContent;
        if (!text || text.includes('错误') || text.includes('无法解析')) {
            this.showStatus('没有有效内容可复制', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showStatus('已复制到剪贴板', 'success');
        } catch (error) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showStatus('已复制到剪贴板', 'success');
        }
    }

    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            this.jsonInput.value = text;
            
            if (this.autoFormatCheckbox.checked) {
                setTimeout(() => this.formatJSON(), 10);
            }
            
            this.showStatus('已从剪贴板粘贴', 'info');
        } catch (error) {
            this.showStatus('无法访问剪贴板', 'error');
        }
    }

    clearAll() {
        this.jsonInput.value = '';
        this.jsonOutput.textContent = '';
        this.showStatus('已清空', 'info');
    }

    // ==================== Tab页相关功能 ====================

    openInTab() {
        // 获取当前输入的内容
        const currentInput = this.jsonInput.value.trim();
        
        // 发送消息给background script打开Tab页
        chrome.runtime.sendMessage({ 
            action: 'openInTab',
            data: {
                jsonInput: currentInput,
                autoFormat: this.autoFormatCheckbox.checked
            }
        }, (response) => {
            if (response && response.success) {
                this.showStatus('已在独立标签页打开', 'info');
                // 可选：关闭popup
                setTimeout(() => {
                    window.close();
                }, 1000);
            }
        });
    }

    shareWithTab(input) {
        // 发送当前格式化内容到已打开的Tab页
        chrome.runtime.sendMessage({
            action: 'updateTabContent',
            data: {
                jsonInput: input,
                autoFormat: this.autoFormatCheckbox.checked
            }
        });
    }

    // ==================== 辅助功能方法 ====================

    loadExample() {
        const example = `{
    detail: {
        sameTri: "",
        flightNo: "",
        id: "u",
        json: "{\\"flightNo\\":\\"\\"}",
        order: {
            usernameCn: "小",
            usernameTitle: "Mr",
            phoneCode: "+86",
            phone: "",
            email: "z"
        }
    },
    contact: {
        title: "male",
        name: "小"
    },
    id: "123456",
    appId: "Ya"
}`;
        this.jsonInput.value = example;
        this.formatJSON();
        this.showStatus('示例已加载', 'info');
    }

    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = `status show ${type}`;
        
        setTimeout(() => {
            this.status.classList.remove('show');
        }, 3000);
    }

    // ==================== 存储相关方法 ====================

    saveToStorage(key, value) {
        try {
            chrome.storage.local.set({ [key]: value });
        } catch (error) {
            console.error('保存到存储失败:', error);
        }
    }

    loadSettings() {
        try {
            chrome.storage.local.get(['lastInput', 'autoFormat'], (result) => {
                if (result.lastInput) {
                    this.jsonInput.value = result.lastInput;
                    // 自动格式化上次的内容
                    setTimeout(() => {
                        if (this.autoFormatCheckbox.checked) {
                            this.formatJSON();
                        }
                    }, 100);
                }
                if (result.autoFormat !== undefined) {
                    this.autoFormatCheckbox.checked = result.autoFormat;
                }
            });
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    // ==================== 尝试修复损坏的JSON（备用方法） ====================
    
    attemptFixBrokenJSON(str) {
        let result = str;
        
        // 1. 确保字符串以 { 或 [ 开头
        if (!/^[\{\[]/.test(result.trim())) {
            result = '{' + result;
        }
        
        // 2. 确保字符串以 } 或 ] 结尾
        if (!/[\}\]]$/.test(result.trim())) {
            result = result + '}';
        }
        
        // 3. 添加缺失的引号
        result = result.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
        
        // 4. 移除注释（单行和多行）
        result = result.replace(/\/\/.*$/gm, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // 5. 修复可能的未闭合引号
        const lines = result.split('\n');
        let inString = false;
        let quoteChar = '';
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const prevChar = j > 0 ? line[j - 1] : '';
                
                if (!inString && (char === '"' || char === "'") && prevChar !== '\\') {
                    inString = true;
                    quoteChar = char;
                } else if (inString && char === quoteChar && prevChar !== '\\') {
                    inString = false;
                    quoteChar = '';
                }
            }
            
            // 如果行结束时仍在字符串中，添加闭合引号
            if (inString && i < lines.length - 1) {
                lines[i] = line + quoteChar;
                inString = false;
                quoteChar = '';
            }
        }
        
        result = lines.join('\n');
        
        return result;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const formatter = new JSONFormatter();
    
    // 检查URL参数（从Tab页跳转回来时可能带有数据）
    const urlParams = new URLSearchParams(window.location.search);
    const sharedInput = urlParams.get('input');
    if (sharedInput) {
        formatter.jsonInput.value = decodeURIComponent(sharedInput);
        formatter.formatJSON();
    }
});

// 当popup关闭时，发送消息给background.js
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        chrome.runtime.sendMessage({ action: 'popupClosed' });
    }
});