const PEDDING = "pedding";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function resolvePromise(promise, x, resolve, reject) {
  // 如果 promise 和 x 指向同一对象，即自己调用自己，则抛出类型错误
  if (promise === x) {
    return reject(
      new TypeError("The promise and the return value are the same")
    );
  }

  const isObject = Object.prototype.toString.call(x) === "[object Object]";
  const isFunction = Object.prototype.toString.call(x) === "[object Function]";
  if (isObject || isFunction) {
    // 如果x是null，应该直接resolve
    if (x === null) {
      return resolve(x);
    }

    let then;
    try {
      // 把 x.then 赋值给 then
      then = x.then;
    } catch (error) {
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
      return reject(error);
    }

    // 如果 then 是函数
    if (Object.prototype.toString.call(then) === "[object Function]") {
      let called = false;
      // 将 x 作为函数的作用域 this 调用之
      // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise
      // 名字重名了，我直接用匿名函数了
      try {
        then.call(
          x,
          // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          (y) => {
            // 如果 resolvePromise 和 rejectPromise 均被调用，
            // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            // 实现这条需要前面加一个变量called
            if (called) return;
            called = true;
            resolvePromise(promise, y, resolve, reject);
          },
          // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } catch (error) {
        // 如果调用 then 方法抛出了异常 e：
        // 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
        if (called) return;

        // 否则以 e 为据因拒绝 promise
        reject(error);
      }
    } else {
      // 如果 then 不是函数，以 x 为参数执行 promise
      resolve(x);
    }
  } else {
    // 如果 x 不为对象或者函数，以 x 为参数执行 promise
    resolve(x);
  }
}

class MyPromise {
  // 初始化存储状态，默认值为pending
  status = PEDDING;
  // 初始化resolve参数value
  value = null;
  // 初始化reject参数reason
  reason = null;
  // 初始化成功回调缓存
  onFulfilledCallback = [];
  //初始化失败回调缓存
  onRejectedCallback = [];

  // 构造函数
  constructor(executor) {
    try {
      // 立即执行函数
      executor(this.resolve, this.reject);
    } catch (err) {
      this.reject(err);
    }
  }

  /**
    这里使用箭头函数的原因：
      1、函数中的this指向的是全局window，严格模式指向undefined
      2、new运算符会创建一个空的JavaScript对象作为this的上下文
      3、箭头函数不会创建执行上下文，this是指向MyPromise的实例
    */
  // 更改成功后的状态
  resolve = (value) => {
    // 如果状态为pending，则设置为fulfilled状态，并缓存值
    if (this.status === PEDDING) {
      // 改变状态为fulfilled
      this.status = FULFILLED;
      // 缓存成功之后的值
      this.value = value;
      // 若缓存回调中存在值，则执行
      while (this.onFulfilledCallback.length) {
        // 出队列执行回调
        this.onFulfilledCallback.shift()(value);
      }
    }
  };
  // 更改失败后的状态
  reject = (reason) => {
    // 如果状态为pending，则设置为rejected状态，并缓存失败原因
    if (this.status === PEDDING) {
      // 改变状态为rejected
      this.status = REJECTED;
      // 缓存失败原因
      this.reason = reason;
      // 若缓存回调中存在值，则执行
      while (this.onRejectedCallback.length) {
        // 出队列执行回调
        this.onRejectedCallback.shift()(reason);
      }
    }
  };

  // then方法
  then(onFulfilled, onRejected) {
    // 如果传入的不是函数，则转化为函数
    const onFulfilledReal =
      Object.prototype.toString.call(onFulfilled) === "[object Function]"
        ? onFulfilled
        : (value) => value;
    const onRejectedReal =
      Object.prototype.toString.call(onRejected) === "[object Function]"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new Promise((resolve, reject) => {
      // 创建一个微任务，等待promise2初始化完成
      const fulfilledMircotask = () =>
        queueMicrotask(() => {
          try {
            // 调用成功回调，把成功的值返回
            const x = onFulfilledReal(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      // 创建一个微任务，等待promise2初始化完成
      const rejectedMircotask = () =>
        queueMicrotask(() => {
          try {
            // 调用失败回调，把失败原因返回
            const x = onRejectedReal(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      // 如果是成功状态，执行成功回调，如果是失败状态，执行失败回调
      if (this.status === FULFILLED) {
        fulfilledMircotask();
      } else if (this.status === REJECTED) {
        rejectedMircotask();
      } else {
        // 缓存当前待执行的成功回调，入成功队列
        this.onFulfilledCallback.push(fulfilledMircotask);
        // 缓存当前待执行失败的回调，入失败队列
        this.onRejectedCallback.push(rejectedMircotask);
      }
    });

    return promise2;
  }

  // catch 实现
  catch(onRejected) {
    this.then(undefined, onRejected);
  }

  // finally 无论成功或失败都会执行
  finally(fn) {
    return this.then(
      (value) => {
        return MyPromise.resolve(fn()).then(() => {
          return value;
        });
      },
      (error) => {
        return MyPromise.resolve(fn()).then(() => {
          throw error;
        });
      }
    );
  }

  // resolve 静态方法
  static resolve(value) {
    // 如果是当前对象的实例，原样返回
    if (value instanceof MyPromise) {
      return value;
    }

    // 重新new一个Promise对象
    return new MyPromise((resolve) => {
      resolve(value);
    });
  }

  // reject 静态方法
  static reject(reason) {
    // 如果是当前对象的实例，原样返回
    if (reason instanceof MyPromise) {
      return reason;
    }

    // 重新new一个Promise对象
    return new MyPromise((_, reject) => {
      reject(reason);
    });
  }

  // all 静态方法，全部成功则返回成功，有一个失败，则返回失败
  static all(promiseList) {
    return new MyPromise((resolve, reject) => {
      // 获取传入数组的长度
      const len = promiseList.length;
      // 初始化结果数组
      const result = [];
      // 初始化计数器
      let count = 0;

      // 遍历传入的方法
      promiseList.forEach((promise) => {
        MyPromise.resolve(promise).then(
          (value) => {
            count++;
            result[index] = value;

            if (count === len) {
              return resolve(result);
            }
          },
          (reason) => reject(reason)
        );
      });
    });
  }

  // race 静态方法，谁先完成，就返回谁
  static race(promiseList) {
    return new MyPromise((resolve, reject) => {
      // 获取传入数组的长度
      const len = promiseList.length;

      if (len === 0) {
        resolve();
      } else {
        for (let i = 0; i < len; i++) {
          MyPromise.resolve(promiseList[i]).then(
            (value) => {
              return resolve(value);
            },
            (reason) => {
              return reject(reason);
            }
          );
        }
      }
    });
  }

  // allSettled静态实现
  static allSettled(promiseList) {
    return new MyPromise((reslove, reject) => {
      const len = promiseList.length;
      const result = [];
      let count = 0;

      if (len === 0) {
        resolve(result);
      } else {
        for (let i = 0; i < len; i++) {
          MyPromise.resolve(promiseList[i]).then(
            (value) => {
              count++;
              result[i] = {
                status: "fulfilled",
                value,
              };

              if (len === count) {
                return resolve(result);
              }
            },
            (reason) => {
              count++;
              result[i] = {
                status: "rejected",
                reason,
              };

              if (len === count) {
                return resolve(result);
              }
            }
          );
        }
      }
    });
  }
}

// Promise A+测试方法
MyPromise.deferred = function () {
  var result = {};
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve;
    result.reject = reject;
  });

  return result;
};

module.exports = MyPromise;
