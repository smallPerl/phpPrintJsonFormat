// 测试脚本：检测格式化按钮功能
// 直接使用json-utils.js中的核心方法
const fs = require('fs');

// 导入json-utils.js中的核心方法
const jsonUtilsModule = require('./json-utils.js');
const { parseEnhancedJSON, convertJsObjectToJson } = jsonUtilsModule;

// 格式化方法
function formatJSON(input) {
    try {
        const parsed = parseEnhancedJSON(input);
        const formatted = JSON.stringify(parsed, null, 4);
        return {
            success: true,
            result: formatted
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// 测试用例
const testCases = [
    {
        name: '测试用例1：冒号格式，带多余逗号',
        input: '{oev: "",id: "123123",name: "",fame: "fafa"},'
    },
    {
        name: '测试用例2：等号格式，带HTML标签',
        input: '{id=123466, code=Pd3, remark=, source=POW, type=123, title=提交, message=请点击：<a target=\'_blank\' href=\' http://www.abc.com?a=1&b=2&c=3 \' >查看</a>, source=0,od=33333}'
    },
    {
        name: '测试用例3：嵌套结构',
        input: '{\n        detail: {\n            sametri: "",\n            flightNo: "",\n            id: "u",\n            json: "{\\"flightNo\\":\\"\\"}",\n            order: {\n                cn: "xiaoha",\n                title: "Mr"\n            }\n    }\n}'
    },
    {
        name: '测试用例4：包含URL和post_data',
        input: 'url: " http://www.baba.com/a/b/c ", \n post_data: {\n     id: "123123", \n     name: "haha" \n },'
    }
];

// 运行测试
console.log('开始测试格式化功能...\n');

testCases.forEach((testCase, index) => {
    console.log(`=== 测试用例 ${index + 1}: ${testCase.name} ===`);
    console.log('输入:');
    console.log(testCase.input);
    console.log('\n输出:');
    
    const result = formatJSON(testCase.input);
    if (result.success) {
        console.log(result.result);
        console.log('\n✅ 测试通过');
    } else {
        console.log('❌ 测试失败:');
        console.log(result.error);
    }
    console.log('\n' + '='.repeat(80) + '\n');
});

console.log('所有测试用例执行完成！');
