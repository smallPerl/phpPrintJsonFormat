class TabJSONFormatter {
    constructor() {
        this.jsonInput = document.getElementById('json-input');
        this.jsonOutput = document.getElementById('json-output');
        this.formatBtn = document.getElementById('format-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.pasteBtn = document.getElementById('paste-btn');
        this.minifyBtn = document.getElementById('minify-btn');
        this.validateBtn = document.getElementById('validate-btn');
        this.toQueryBtn = document.getElementById('to-query-btn');
        this.requestToQueryBtn = document.getElementById('request-to-query-btn');
        this.status = document.getElementById('status');
        this.autoFormatCheckbox = document.getElementById('auto-format');
        this.defaultViewModeSelect = document.getElementById('default-view-mode');
        this.loadExampleBtn = document.getElementById('load-example');
        
        this.history = [];
        this.maxHistoryItems = 50;
        
        this.init();
    }

    init() {
        this.formatBtn.addEventListener('click', () => this.formatJSON());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.minifyBtn.addEventListener('click', () => this.minifyJSON());
        this.validateBtn.addEventListener('click', () => this.validateJSON());
        this.toQueryBtn.addEventListener('click', () => this.convertToQueryString());
        this.requestToQueryBtn.addEventListener('click', () => this.convertRequestToUrlWithQuery());
        this.loadExampleBtn.addEventListener('click', () => this.loadExample());
        this.defaultViewModeSelect.addEventListener('change', (e) => this.setDefaultViewMode(e.target.value));
        
        this.jsonInput.addEventListener('paste', (e) => {
            setTimeout(() => {
                if (this.autoFormatCheckbox.checked) {
                    this.formatJSON();
                }
            }, 10);
        });
        
        this.loadSettings();
        this.checkForSharedData();
        
        console.log('Tab JSON Formatter 已初始化');
    }
    
    // 从popup.js复制JSONFormatter的核心功能
    parseEnhancedJSON(str) {
        try {
            return JSON.parse(str);
        } catch (standardError) {
            try {
                let processed = this.convertJsObjectToJson(str);
                return JSON.parse(processed);
            } catch (jsError) {
                // 尝试检测并移除最后面多余的"," 
                try {
                    let trimmedStr = str.trim();
                    // 检查是否以","结尾，并且前面有"}"或"]"
                    if (trimmedStr.endsWith(',')) {
                        // 找到最后一个"}"或"]"
                        const lastBraceIndex = Math.max(
                            trimmedStr.lastIndexOf('}'),
                            trimmedStr.lastIndexOf(']')
                        );
                        if (lastBraceIndex > -1) {
                            // 检查最后一个"}"或"]"后面是否只有空格和一个"," 
                            const afterBrace = trimmedStr.substring(lastBraceIndex + 1).trim();
                            if (afterBrace === ',') {
                                // 移除多余的"," 
                                trimmedStr = trimmedStr.substring(0, lastBraceIndex + 1) + trimmedStr.substring(lastBraceIndex + 1).replace(/,\s*$/, '');
                                // 再次尝试解析
                                let processed = this.convertJsObjectToJson(trimmedStr);
                                return JSON.parse(processed);
                            }
                        }
                    }
                    // 如果没有多余的","或处理后仍然失败，抛出原始错误
                    throw new Error(`JSON解析失败:\n标准JSON错误: ${standardError.message}\nJS对象转换错误: ${jsError.message}`);
                } catch (finalError) {
                    throw new Error(`JSON解析失败:\n标准JSON错误: ${standardError.message}\nJS对象转换错误: ${jsError.message}\n尝试修复错误: ${finalError.message}`);
                }
            }
        }
    }

    convertJsObjectToJson(jsString) {
        let str = jsString.trim();
        
        // 移除变量声明和分号
        str = str.replace(/^(var|let|const|function|return|export\s+default)\s+[^{]*=/, '');
        str = str.replace(/;[^}]*$/, '');
        
        // 找到第一个 { 或 [ 开始的位置
        const startMatch = str.match(/[{\[]/);
        if (!startMatch) {
            throw new Error('未找到有效的JSON对象或数组起始符');
        }
        
        const startIndex = str.indexOf(startMatch[0]);
        if (startIndex > 0) {
            str = str.substring(startIndex);
        }
        
        // 找到最后一个匹配的 } 或 ]
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
        
        // 转换单引号字符串为双引号字符串
        str = this.convertSingleQuotes(str);
        
        // 给属性名添加双引号
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

    convertToQueryString() {
        try {
            // 尝试从输入或输出获取JSON数据
            let jsonData;
            const input = this.jsonInput.value.trim();
            const output = this.jsonOutput.textContent.trim();
            
            if (output && !output.includes('错误') && !output.includes('无法解析')) {
                // 从输出获取格式化的JSON
                try {
                    jsonData = JSON.parse(output);
                } catch (e) {
                    // 如果输出不是有效的JSON格式（例如URL字符串），则从输入获取
                    if (input) {
                        jsonData = this.parseEnhancedJSON(input);
                    } else {
                        this.showStatus('请输入JSON字符串', 'error');
                        return;
                    }
                }
            } else if (input) {
                // 从输入获取JSON
                jsonData = this.parseEnhancedJSON(input);
            } else {
                this.showStatus('请输入JSON字符串', 'error');
                return;
            }

            // 将JSON对象转换为query string
            const queryString = this.buildQueryString(jsonData);
            this.jsonOutput.textContent = queryString;
            this.showStatus('转换为query string成功', 'success');
        } catch (error) {
            this.showStatus('错误: ' + error.message, 'error');
            this.jsonOutput.textContent = error.message;
        }
    }

    buildQueryString(obj, prefix = '') {
        const parts = [];
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const fullKey = prefix ? `${prefix}[${key}]` : key;
                
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    // 递归处理嵌套对象
                    parts.push(this.buildQueryString(value, fullKey));
                } else if (Array.isArray(value)) {
                    // 处理数组
                    value.forEach((item, index) => {
                        const arrayKey = `${fullKey}[${index}]`;
                        if (item && typeof item === 'object') {
                            parts.push(this.buildQueryString(item, arrayKey));
                        } else {
                            parts.push(`${encodeURIComponent(arrayKey)}=${encodeURIComponent(item)}`);
                        }
                    });
                } else {
                    // 处理基本类型
                    parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
                }
            }
        }
        
        return parts.join('&');
    }

    convertRequestToUrlWithQuery() {
        try {
            const input = this.jsonInput.value.trim();
            if (!input) {
                this.showStatus('请输入内容', 'error');
                return;
            }

            // 提取url
            const urlMatch = input.match(/url:\s*["'`]\s*([^"'`]+)\s*["'`]/);
            if (!urlMatch) {
                this.showStatus('未找到url', 'error');
                return;
            }
            let url = urlMatch[1].trim();

            // 提取post_data
            const postDataMatch = input.match(/post_data:\s*({[\s\S]*?})/);
            let queryString = '';
            
            if (postDataMatch) {
                try {
                    // 解析post_data
                    const postDataStr = postDataMatch[1];
                    const postData = this.parseEnhancedJSON(postDataStr);
                    // 转换为query string
                    queryString = this.buildQueryString(postData);
                } catch (error) {
                    this.showStatus('解析post_data失败: ' + error.message, 'error');
                    return;
                }
            }

            // 拼接url和query string
            let resultUrl = url;
            if (queryString) {
                // 检查url是否已经有查询参数
                const hasQueryParams = url.includes('?');
                resultUrl += hasQueryParams ? '&' : '?';
                resultUrl += queryString;
            }

            // 显示结果
            this.jsonOutput.textContent = resultUrl;
            this.showStatus('识别并转换成功', 'success');
        } catch (error) {
            this.showStatus('错误: ' + error.message, 'error');
            this.jsonOutput.textContent = error.message;
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

    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = `status show ${type}`;
        
        setTimeout(() => {
            this.status.classList.remove('show');
        }, 3000);
    }

    // 设置管理
    loadSettings() {
        chrome.storage.local.get([
            'defaultViewMode', 
            'autoFormat'
        ], (result) => {
            if (result.defaultViewMode) {
                this.defaultViewModeSelect.value = result.defaultViewMode;
            }
            if (result.autoFormat !== undefined) {
                this.autoFormatCheckbox.checked = result.autoFormat;
            }
        });
    }

    setDefaultViewMode(mode) {
        chrome.storage.local.set({ defaultViewMode: mode });
        
        // 发送消息给background.js，通知它更新默认打开方式
        chrome.runtime.sendMessage({ 
            action: 'updateDefaultViewMode', 
            mode: mode 
        }, (response) => {
            if (response && response.success) {
                console.log('默认打开方式已更新');
            }
        });
        
        this.showStatus(`默认打开方式已设置为: ${mode === 'popup' ? '弹出窗口' : '独立页面'}`, 'success');
    }

    // 检查是否有来自popup的共享数据
    checkForSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('data');
        const requestContent = urlParams.get('requestContent');
        
        if (sharedData) {
            try {
                const data = JSON.parse(decodeURIComponent(sharedData));
                if (data.jsonInput) {
                    this.jsonInput.value = data.jsonInput;
                    if (data.autoFormat) {
                        setTimeout(() => this.formatJSON(), 100);
                    }
                }
            } catch (error) {
                console.error('解析共享数据失败:', error);
            }
        } else if (requestContent) {
            // 处理来自右键菜单的request内容
            try {
                const content = decodeURIComponent(requestContent);
                this.jsonInput.value = content;
                // 自动调用request转queryStr功能
                setTimeout(() => this.convertRequestToUrlWithQuery(), 100);
            } catch (error) {
                console.error('解析request内容失败:', error);
                this.showStatus('解析request内容失败: ' + error.message, 'error');      
            }
        }
    }

    // 其他功能
    loadExample() {
        const example = `{
    detail: {
        sameTri: "",
        flightNo: "",
        id: "u",
        json: "{\\"flightNo\\":\\"\\"}",
        order: {
            cn: "小",
            title: "Mr"
        }
    },
    contact: {
        title: "male",
        name: "小"
    },
    id: "123456"
}`;
        this.jsonInput.value = example;
        this.formatJSON();
        this.showStatus('示例已加载', 'info');
    }


}

// 初始化Tab页面的格式化工具
document.addEventListener('DOMContentLoaded', () => {
    new TabJSONFormatter();
});

