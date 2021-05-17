### 安装

```
yarn add promises-aplus-tests -D 或 npm install promises-aplus-tests -D
```

### 配置测试用例

```JavaScript
// Promise A+测试方法
MyPromise.deferred = function () {
  var result = {};
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve;
    result.reject = reject;
  });

  return result;
};
```

### package.json 配置

```JavaScript
{
  // ...
  "main": "my-promise.js", // 入口
  "scripts": {
    "test": "promises-aplus-tests my-promise" // 测试命令
  },
  // ...
}

```

### 测试命令

```
yarn test 或 npm run test
```
