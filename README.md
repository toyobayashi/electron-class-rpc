# electron-class-rpc

In renderer process, constructing an instance of a class which is in main process.

## Install

``` bash
$ npm install electron-class-rpc
```

## Usage

```js
// main process

// require('electron-function-ipc/main.js') // Enable function callback
const classRpcMain = require('electron-class-rpc/main.js')

class ApiClass {
  constructor (a, b) {
    this.a = a
    this.b = b
  }

  static getTypeSync () {
    return process.type
  }

  static getType () {
    return 'async ' + process.type // equals return Promise.resolve('async ' + process.type)
  }

  getPropSync () {
    return this.a 
  }

  getProp () {
    return this.b // equals return Promise.resolve(this.b)
  }

  static _notExport () {
    console.log('The member whose name starts with "_" is recognized as a private member and it won\'t be exported.')
  }
}

class ApiClassEx extends ApiClass {
  constructor (a, b, c) {
    super(a, b)
    this.c = c
  }

  static testSync () {
    console.log('test')
  }

  testSync () {
    return this.c
  }
}

classRpcMain.exportClass('ApiClass', ApiClass)
classRpcMain.exportClass('ApiClassEx', ApiClassEx)
```

```js
// renderer process

// require('electron-function-ipc/renderer.js') // Enable function callback
const classRpcRenderer = require('electron-class-rpc/renderer.js')

async function main () {
  const ApiClass = classRpcRenderer.importClass('ApiClass')

  const syncType = ApiClass.getTypeSync()
  console.log(syncType) // 'browser'
  const asyncType = await ApiClass.getType()
  console.log(asyncType) // 'async browser'

  console.log(ApiClass._notExport) // undefined

  const instance = new ApiClass('foo', 23)
  console.log(instance.a, instance.b) // 'foo' 23

  instance.a = 'bar'
  instance.b = 22

  const syncProp = instance.getPropSync()
  console.log(syncProp) // 'bar'

  const asyncProp = await instance.getProp()
  console.log(asyncProp) // 22

  instance.destroy() // Don't forget to destroy instance.
  try {
    instance.getPropSync() // throw error
  } catch (err) {
    console.log(err)
  }

  const ApiClassEx = classRpcRenderer.importClass('ApiClassEx')
  ApiClassEx.testSync() // main process console log 'test'

  const ex = new ApiClassEx('baz', 6, 9)
  console.log(ex.a, ex.b, ex.c) // 'baz' 6 9
  ex.a = 'www'
  ex.c = 2
  console.log(ex.getPropSync()) // www
  console.log(ex.testSync()) // 2

  ex.destroy() // Don't forget to destroy instance.
}

main()
```

## Note

* Specifying functions as parameter is not supported. You can use [toyobayashi/electron-function-ipc](https://github.com/toyobayashi/electron-function-ipc) if you want.
* If a method name ends with "Sync", it is a synchronous function, else it is an async function which will return `Promise` in renderer process.
* If a member name starts with "_", it is recognized as a private member and it can not be access in renderer process.
* Member properties should be primitive values. If not, what renderer process access is a copy to it instead of a referrence.
