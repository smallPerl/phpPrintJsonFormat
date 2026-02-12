### 这是一个chrome扩展，功能是：将php语法的var_dump() 或print_r()打印的数组结果进行格式化成标准的json
### 可以自动补齐key缺失的双引号，自动补齐结尾可能缺失的 "}"，变成标准的json格式

## 例子：
### 按钮【格式化】功能例子：
输入内容：
```
{
        detail: {
            sametri: "",
            flightNo: "",
            id: "u",
            json: "{\"flightNo\":\"\"}",
            order: {
                usernameCn: "小",
                usernameTitle: "Mr"
            }
    }
}
```
自动补充key缺失的双引号，格式化后结果为：
```
{
    "detail": {
        "sametri": "",
        "flightNo": "",
        "id": "u",
        "json": "{\"flightNo\":\"\"}",
        "order": {
            "usernameCn": "小",
            "usernameTitle": "Mr"
        }
    }
}
```

### 按钮【转queryStr】功能例子：
输入：
```
{
    "id": "123123",
    "name": "haha"
}
```
结果：
```
id=123123&name=haha
```

### 按钮【识别url和data并转queryStr】功能例子：
输入示例：
```
 url: "http://www.baba.com/a/b/c",
    post_data: {
        id: "123123",
        name: "haha"
    },
```
结果：
```
http://www.baba.com/a/b/c?id=123123&name=haha
```

## 右键功能
### phpJsonFormat -> request转queryStr
简化操作链路：将备选中的内容，自动通过request的转queryStr功能，将其转换为url + queryStr格式。

## 测试
```
node test-all-cases.js
```