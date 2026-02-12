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
        this.toFormDataBtn = document.getElementById('to-form-data-btn');
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
        this.toFormDataBtn.addEventListener('click', () => this.convertToFormData());
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
    
    parseEnhancedJSON(str) {
        return window.JsonUtils.parseEnhancedJSON(str);
    }

    convertJsObjectToJson(jsString) {
        return window.JsonUtils.convertJsObjectToJson(jsString);
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

    convertToFormData() {
        try {
            let jsonData;
            const input = this.jsonInput.value.trim();
            const output = this.jsonOutput.textContent.trim();
            
            if (output && !output.includes('错误') && !output.includes('无法解析')) {
                try {
                    jsonData = JSON.parse(output);
                } catch (e) {
                    if (input) {
                        jsonData = this.parseEnhancedJSON(input);
                    } else {
                        this.showStatus('请输入JSON字符串', 'error');
                        return;
                    }
                }
            } else if (input) {
                jsonData = this.parseEnhancedJSON(input);
            } else {
                this.showStatus('请输入JSON字符串', 'error');
                return;
            }

            const formDataLines = this.buildFormData(jsonData);
            this.jsonOutput.textContent = formDataLines.join('\n');
            this.showStatus('转换为form-data成功', 'success');
        } catch (error) {
            this.showStatus('错误: ' + error.message, 'error');
            this.jsonOutput.textContent = error.message;
        }
    }

    buildFormData(obj, prefix = '') {
        const lines = [];
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const fullKey = prefix ? `${prefix}[${key}]` : key;
                
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    lines.push(...this.buildFormData(value, fullKey));
                } else if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        const arrayKey = `${fullKey}[${index}]`;
                        if (item && typeof item === 'object') {
                            lines.push(...this.buildFormData(item, arrayKey));
                        } else {
                            lines.push(`${arrayKey}:${item}`);
                        }
                    });
                } else {
                    lines.push(`${fullKey}:${value}`);
                }
            }
        }
        
        return lines;
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

// 引入JsonUtils工具类 - 动态加载
function loadJsonUtils(callback) {
    const script = document.createElement('script');
    script.src = 'json-utils.js';
    script.onload = callback;
    script.onerror = () => console.error('Failed to load json-utils.js');
    document.head.appendChild(script);
}

loadJsonUtils(() => {
    // 初始化Tab页面的格式化工具
    new TabJSONFormatter();
});

