Object.defineProperty(window, 'ELECTRON_DISABLE_SECURITY_WARNINGS', { value: true })

const classRpcRenderer = require('../renderer.js')

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

  instance.destroy() // Don't forget destroy instance.
}

main()
