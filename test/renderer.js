Object.defineProperty(window, 'ELECTRON_DISABLE_SECURITY_WARNINGS', { value: true })

const classRpcRenderer = require('../renderer.js')

async function main () {
  console.log(classRpcRenderer.listClass()) // ['ApiClass', 'ApiClassEx']

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

  classRpcRenderer.removeClass('ApiClass')
  console.log(classRpcRenderer.listClass()) // ['ApiClassEx']
  try {
    ApiClass.getTypeSync() // throw error
  } catch (err) {
    console.log(err)
  }

  try {
    classRpcRenderer.importClass('ApiClass') // throw error
  } catch (err) {
    console.log(err)
  }
}

main()
