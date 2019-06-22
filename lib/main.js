const { ipcMain } = require('electron')

const objMap = new Map()
const classMap = new Map()

function exportClass (className, ClassConstructor) {
  if (classMap.has(className)) {
    throw new Error(`Class '${className}' has been exported.`)
  }

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

  classMap.set(className, {
    publicStaticProperties,
    publicStaticMethods,
    publicProperties,
    publicMethods,
    C: ClassConstructor
  })
}

ipcMain.on('__electronClassRpc__', function (
  /**@type {import('electron').Event} */ event,
  /**@type {string} */                   className,
  /**@type {string} */                   callId,
  /**@type {string} */                   oid,
  /**@type {0 | 1} */                    type,
  /**@type {string} */                   name,
  /**@type {any[]} */                    ...args
) {
  // delete instance
  if (name === '<delete>' && type === 1) {
    if (!oid) {
      returnValue(event, createResult(new Error(`<init> Bad request, without oid.`)))
      return
    }
    objMap.delete(oid)
    returnValue(event, createResult(null, true))
    return
  }

  let classInfo
  try {
    classInfo = getClass(className)
  } catch (err) {
    returnValue(event, createResult(err), callId)
    return
  }

  const { C: ClassConstructor, ...members } = classInfo

  // Class constructor call
  if (name === '<init>' && type === 1) {
    if (!oid) {
      returnValue(event, createResult(new Error(`<init> Bad request, without oid.`)))
      return
    }
    objMap.set(oid, new ClassConstructor(...args))
    returnValue(event, createResult(null, true))
    return
  }

  // static call
  if (!oid && type === 1) {
    try {
      const res = ClassConstructor[name](...args)
      if (isPromiseLike(res)) {
        res.then((value) => {
          returnValue(event, createResult(null, value), callId)
        }).catch((err) => {
          returnValue(event, createResult(err), callId)
        })
      } else {
        returnValue(event, createResult(null, res), callId)
      }
    } catch (err) {
      returnValue(event, createResult(err), callId)
    }
    return
  }

  // member call
  if (oid && type === 1) {
    if (!objMap.has(oid)) {
      returnValue(event, createResult(new Error(`Object ${oid} has been destroyed.`)), callId)
      return
    }
    try {
      const res = objMap.get(oid)[name](...args)
      if (isPromiseLike(res)) {
        res.then((value) => {
          returnValue(event, createResult(null, value), callId)
        }).catch((err) => {
          returnValue(event, createResult(err), callId)
        })
      } else {
        returnValue(event, createResult(null, res), callId)
      }
    } catch (err) {
      returnValue(event, createResult(err), callId)
    }
    return
  }

  // static get/set
  if (!oid && type === 0) {
    const [oparation, value] = args
    try {
      if (oparation === 'set') {
        ClassConstructor[name] = value
        returnValue(event, createResult(null, true))
      } else if (oparation === 'get') {
        returnValue(event, createResult(null, ClassConstructor[name]))
      }
    } catch (err) {
      returnValue(event, createResult(err))
    }

    return
  }

  // member get/set
  if (oid && type === 0) {
    if (!objMap.has(oid)) {
      returnValue(event, createResult(new Error(`Object ${oid} has been destroyed.`)))
      return
    }
    const obj = objMap.get(oid)
    const [oparation, value] = args
    try {
      if (oparation === 'set') {
        obj[name] = value
        returnValue(event, createResult(null, true))
      } else if (oparation === 'get') {
        returnValue(event, createResult(null, obj[name]))
      }
    } catch (err) {
      returnValue(event, createResult(err))
    }

    return
  }

  returnValue(event, createResult(null, false), callId)
})

ipcMain.on('__electronClassRpc_rendererApi__', (event, name, ...args) => {
  if (name === 'importClass') {
    let classInfo
    try {
      classInfo = getClass(args[0])
    } catch (err) {
      returnValue(event, createResult(err))
      return
    }
    const { C, ...res } = classInfo
    returnValue(event, createResult(null, res))
    return
  }

  if (name === 'listClass') {
    const classList = [...classMap.keys()]
    event.returnValue = classList
    return
  }

  if (name === 'removeClass') {
    event.returnValue = classMap.delete(args[0])
    return
  }
  event.returnValue = null
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

/**
 * @param {any} o
 * @returns {boolean}
 */
function isPromiseLike (o) {
  return o instanceof Promise || Object.prototype.toString.call(o) === '[object Promise]' || (o !== null && typeof o === 'object' && typeof o.then === 'function' && typeof o.catch === 'function')
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isSync (name) {
  return name.endsWith('Sync')
}

/**
 * @param {import('electron').Event} event
 * @param {any} value
 * @param {string=} callId
 */
function returnValue (event, value, callId) {
  if (callId) {
    event.sender.send(`__electronClassRpc_call_${callId}_`, value)
  } else {
    event.returnValue = value
  }
}

function getClass (className) {
  if (!classMap.has(className)) {
    throw new Error(`Class '${className}' has not been exported.`)
  }
  return classMap.get(className)
}

module.exports = {
  exportClass
}
