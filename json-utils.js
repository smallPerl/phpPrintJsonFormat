// 核心工具类，提供JSON解析和格式化功能
class JsonUtils {
    // 增强的JSON解析方法
    static parseEnhancedJSON(str) {
        try {
            return JSON.parse(str);
        } catch (standardError) {
            try {
                let processed = JsonUtils.convertJsObjectToJson(str);
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
                                let processed = JsonUtils.convertJsObjectToJson(trimmedStr);
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

    // 将JS对象字符串转换为JSON格式
    static convertJsObjectToJson(jsString) {
        let str = jsString.trim();
        
        // 移除变量声明和分号
        str = str.replace(/^(var|let|const|function|return|export\s+default)\s+[^{]*=/, '');
        str = str.replace(/;[^}]*$/, '');
        
        // 找到第一个 { 或 [ 开始的位置
        const startMatch = str.match(/[\{\[]/);
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
        let inHtmlTag = false;
        let htmlTagLevel = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const prevChar = i > 0 ? str[i - 1] : '';
            
            // 处理HTML标签
            if (char === '<' && !inString) {
                inHtmlTag = true;
                htmlTagLevel++;
            } else if (char === '>' && !inString) {
                htmlTagLevel--;
                if (htmlTagLevel === 0) {
                    inHtmlTag = false;
                }
            }
            
            // 只有在非HTML标签内才处理字符串状态
            if (!inHtmlTag) {
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
        }
        
        if (endIndex !== -1 && endIndex < str.length - 1) {
            str = str.substring(0, endIndex + 1);
        }
        
        // 处理使用等号或冒号的键值对格式
        let processedStr = str;
        
        // 检查是否包含等号格式的键值对
        if (processedStr.includes('=')) {
            // 处理等号格式的键值对
            // 第二步：去掉开头的{和结尾的}
            let content = processedStr.trim();
            if (content.startsWith('{')) {
                content = content.substring(1);
            }
            if (content.endsWith('}')) {
                content = content.substring(0, content.length - 1);
            }
            
            // 第三步：按,分割键值对，注意HTML标签内的逗号和值中的逗号
            const pairs = [];
            let currentPair = '';
            let inHtmlTag = false;
            let htmlTagLevel = 0;
            let inValuePart = false;
            
            for (let i = 0; i < content.length; i++) {
                const char = content[i];
                
                if (char === '<') {
                    inHtmlTag = true;
                    htmlTagLevel++;
                    currentPair += char;
                } else if (char === '>') {
                    htmlTagLevel--;
                    if (htmlTagLevel === 0) {
                        inHtmlTag = false;
                    }
                    currentPair += char;
                } else if (char === '=' && !inHtmlTag) {
                    inValuePart = true;
                    currentPair += char;
                } else if (char === ',' && !inHtmlTag) {
                    // 检查这个逗号是否是键值对分隔符
                    let nextCharIndex = i + 1;
                    // 跳过空格
                    while (nextCharIndex < content.length && /\s/.test(content[nextCharIndex])) {
                        nextCharIndex++;
                    }
                    // 检查下一个非空字符是否是有效的键名开头
                    const nextChar = content[nextCharIndex];
                    if (nextChar && /[a-zA-Z_$]/.test(nextChar)) {
                        // 这是一个键值对分隔符
                        pairs.push(currentPair.trim());
                        currentPair = '';
                        inValuePart = false;
                    } else {
                        // 这是值内部的逗号，保留它
                        currentPair += char;
                    }
                } else {
                    currentPair += char;
                }
            }
            
            // 添加最后一个键值对
            if (currentPair.trim()) {
                pairs.push(currentPair.trim());
            }
            
            // 第四步：处理每个键值对
            const jsonPairs = [];
            
            for (const pair of pairs) {
                // 找到第一个=的位置，注意HTML标签内的=
                let equalIndex = -1;
                let inTag = false;
                let tagLevel = 0;
                
                for (let i = 0; i < pair.length; i++) {
                    const char = pair[i];
                    
                    if (char === '<') {
                        inTag = true;
                        tagLevel++;
                    } else if (char === '>') {
                        tagLevel--;
                        if (tagLevel === 0) {
                            inTag = false;
                        }
                    } else if (char === '=' && !inTag) {
                        equalIndex = i;
                        break;
                    }
                }
                
                if (equalIndex !== -1) {
                    const key = pair.substring(0, equalIndex).trim();
                    const value = pair.substring(equalIndex + 1).trim();
                    
                    // 给键和值添加引号，注意转义值中的双引号
                    const escapedValue = value.replace(/"/g, '\\"');
                    const jsonPair = `"${key}": "${escapedValue}"`;
                    jsonPairs.push(jsonPair);
                }
            }
            
            // 第五步：重新组合成JSON格式
            processedStr = `{${jsonPairs.join(', ')}}`;
        } else {
            // 处理冒号格式的键值对（如{key: value}）
            // 移除多余的结尾逗号
            processedStr = processedStr.replace(/,\s*([}\]])/g, '$1');
            
            // 给键名添加双引号
            processedStr = processedStr.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '"$1":');
        }
        
        str = processedStr;
        
        return str;
    }
}

// 导出核心方法，以便其他脚本可以使用
if (typeof module !== 'undefined' && module.exports) {
module.exports = {
        parseEnhancedJSON: JsonUtils.parseEnhancedJSON,
        convertJsObjectToJson: JsonUtils.convertJsObjectToJson,
        JsonUtils
    };
}

// 全局对象，以便在浏览器环境中使用
if (typeof window !== 'undefined') {
    window.JsonUtils = JsonUtils;
}
