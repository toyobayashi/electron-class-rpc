const { ipcMain } = require('electron')

const objMap = new Map()
const classMap = new Map()

function exportClass (className, ClassConstructor) {
  if (classMap.has(className)) return

  let statics = []
  let clazz = ClassConstructor
  while (clazz.name) {
    statics = Array.from(new Set([...statics, ...Object.getOwnPropertyNames(clazz)]))
    clazz = Object.getPrototypeOf(clazz)
  }

  let methods = []
  let prototype = ClassConstructor.prototype
  while (prototype.constructor.name !== 'Object') {
    methods = Array.from(new Set([...methods, ...Object.getOwnPropertyNames(prototype)]))
    prototype = Object.getPrototypeOf(prototype)
  }

  const publicMethods = methods.filter((name) => typeof ClassConstructor.prototype[name] === 'function' && !(name === 'constructor' || name.startsWith('_')))
  const publicStaticMethods = statics.filter((name) => typeof ClassConstructor[name] === 'function' && !(name.startsWith('_') || ['name', 'length', 'prototype'].includes(name)))
  const publicStaticProperties = statics.filter((name) => typeof ClassConstructor[name] !== 'function' && !(name.startsWith('_') || ['name', 'length', 'prototype'].includes(name)))
  const publicProperties = Object.keys(new ClassConstructor()).filter((name) => !name.startsWith('_'))

  ipcMain.on(className + '#constructor', (event, oid, ...args) => {
    objMap.set(oid, new ClassConstructor(...args))
    event.returnValue = true
  })

  ipcMain.on(className + '#destructor', (event, oid) => {
    objMap.delete(oid)
    event.returnValue = true
  })

  publicMethods.forEach(methodName => {
    ipcMain.on(className + '#' + methodName, (event, ...args) => {
      if (methodName.endsWith('Sync')) {
        const [oid, ...argv] = args
        if (!objMap.has(oid)) {
          event.returnValue = createResult(new Error(`Object ${oid} has been destroyed.`))
          return
        }
        try {
          const res = objMap.get(oid)[methodName](...argv)
          if (Object.prototype.toString.call(res) === '[object Promise]' || (typeof res === 'object' && res !== null && typeof res.then === 'function')) {
            const p = res.then((value) => {
              event.returnValue = createResult(null, value)
            })
            if (typeof p.catch === 'function') {
              p.catch((err) => {
                event.returnValue = createResult(err)
              })
            }
          } else {
            event.returnValue = createResult(null, res)
          }
        } catch (err) {
          event.returnValue = createResult(err)
        }
      } else {
        const [callId, oid, ...argv] = args
        if (!objMap.has(oid)) {
          event.sender.send(className + '#' + methodName, callId, createResult(new Error(`Object ${oid} has been destroyed.`)))
          return
        }
        try {
          const res = objMap.get(oid)[methodName](...argv)
          if (Object.prototype.toString.call(res) === '[object Promise]' || (typeof res === 'object' && res !== null && typeof res.then === 'function')) {
            const p = res.then((value) => event.sender.send(className + '#' + methodName, callId, createResult(null, value)))
            if (typeof p.catch === 'function') {
              p.catch((err) => event.sender.send(className + '#' + methodName, callId, createResult(err)))
            }
          } else {
            event.sender.send(className + '#' + methodName, callId, createResult(null, res))
          }
        } catch (err) {
          event.sender.send(className + '#' + methodName, callId, createResult(err))
        }
      }
    })
  })

  publicStaticMethods.forEach(methodName => {
    ipcMain.on(className + '$' + methodName, (event, ...args) => {
      if (methodName.endsWith('Sync')) {
        try {
          const res = ClassConstructor[methodName](...args)
          if (Object.prototype.toString.call(res) === '[object Promise]' || (typeof res === 'object' && res !== null && typeof res.then === 'function')) {
            const p = res.then((value) => {
              event.returnValue = createResult(null, value)
            })
            if (typeof p.catch === 'function') {
              p.catch((err) => {
                event.returnValue = createResult(err)
              })
            }
          } else {
            event.returnValue = createResult(null, res)
          }
        } catch (err) {
          event.returnValue = createResult(err)
        }
      } else {
        const [callId, ...argv] = args
        try {
          const res = ClassConstructor[methodName](...argv)
          if (Object.prototype.toString.call(res) === '[object Promise]' || (typeof res === 'object' && res !== null && typeof res.then === 'function')) {
            const p = res.then((value) => event.sender.send(className + '$' + methodName, callId, createResult(null, value)))
            if (typeof p.catch === 'function') {
              p.catch((err) => event.sender.send(className + '$' + methodName, callId, createResult(err)))
            }
          } else {
            event.sender.send(className + '$' + methodName, callId, createResult(null, res))
          }
        } catch (err) {
          event.sender.send(className + '$' + methodName, callId, createResult(err))
        }
      }
    })
  })

  publicProperties.forEach(propertyName => {
    ipcMain.on(className + '#' + propertyName, (event, oid, value) => {
      if (!objMap.has(oid)) {
        event.returnValue = createResult(new Error(`Object ${oid} has been destroyed.`))
        return
      }
      if (value) {
        objMap.get(oid)[propertyName] = value
        event.returnValue = createResult(null, true)
      } else {
        event.returnValue = createResult(null, objMap.get(oid)[propertyName])
      }
    })
  })

  publicStaticProperties.forEach(propertyName => {
    ipcMain.on(className + '$' + propertyName, (event, value) => {
      if (value) {
        ClassConstructor[propertyName] = value
        event.returnValue = createResult(null, true)
      } else {
        event.returnValue = createResult(null, ClassConstructor[propertyName])
      }
    })
  })

  classMap.set(className, {
    publicStaticProperties,
    publicStaticMethods,
    publicProperties,
    publicMethods
  })
}

ipcMain.on('__importClass__', (event, className) => {
  event.returnValue = classMap.get(className) || null
})

function parseError (err) {
  const keys = Object.getOwnPropertyNames(err)
  let obj = {}
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = err[keys[i]]
  }
  obj._constructor = err.constructor.name
  return obj
}

function createResult (e, data = null) {
  return {
    err: e && parseError(e),
    data
  }
}

module.exports = {
  exportClass
}
