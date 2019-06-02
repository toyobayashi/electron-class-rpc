const { ipcRenderer } = require('electron')
const generateObjectId = require('./object-id.js')

const classMap = new Map()

function importClass (className) {
  if (classMap.has(className)) return classMap.get(className)

  const classMember = ipcRenderer.sendSync('__importClass__', className)

  if (!classMember) return null

  class Clazz {
    constructor (...args) {
      const oid = generateObjectId()
      this._id = oid
      ipcRenderer.sendSync(className + '#constructor', oid, ...args)
      classMember.publicProperties.forEach((name) => {
        Object.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          get () {
            return getMainSync(className + '#' + name, oid)
          },
          set (value) {
            setMainSync(className + '#' + name, oid, value)
          }
        })
      })
    }

    destroy () {
      ipcRenderer.sendSync(className + '#destructor', this._id)
    }
  }

  classMember.publicStaticProperties.forEach((name) => {
    Object.defineProperty(Clazz, name, {
      configurable: true,
      enumerable: true,
      get () {
        return getMainSync(className + '$' + name, null)
      },
      set (value) {
        setMainSync(className + '$' + name, null, value)
      }
    })
  })

  classMember.publicMethods.forEach((methodName) => {
    Clazz.prototype[methodName] = function (...args) {
      return methodName.endsWith('Sync') ? callMainSync(className + '#' + methodName, this._id, ...args) : callMain(className + '#' + methodName, this._id, ...args)
    }
  })

  classMember.publicStaticMethods.forEach((methodName) => {
    Clazz[methodName] = function (...args) {
      return methodName.endsWith('Sync') ? callMainSync(className + '$' + methodName, null, ...args) : callMain(className + '$' + methodName, null, ...args)
    }
  })

  classMap.set(className, Clazz)
  return Clazz
}

function callMain (methodName, oid, ...args) {
  return new Promise((resolve, reject) => {
    let _callId = generateObjectId()

    ipcRenderer.once(methodName, (_e, callId, res) => {
      if (callId === _callId) {
        _callId = null
        if (res.err) {
          reject(createError(res.err))
        } else {
          resolve(res.data)
        }
      }
    })

    if (oid === null) {
      ipcRenderer.send(methodName, _callId, ...args)
    } else {
      ipcRenderer.send(methodName, _callId, oid, ...args)
    }
  })
}

function callMainSync (methodName, oid, ...args) {
  const res = oid === null ? ipcRenderer.sendSync(methodName, ...args) : ipcRenderer.sendSync(methodName, oid, ...args)
  if (res.err) {
    throw createError(res.err)
  }
  return res.data
}

function getMainSync (propertyName, oid) {
  const res = oid === null ? ipcRenderer.sendSync(propertyName) : ipcRenderer.sendSync(propertyName, oid)
  if (res.err) {
    throw createError(res.err)
  }
  return res.data
}

function setMainSync (propertyName, oid, value) {
  const res = oid === null ? ipcRenderer.sendSync(propertyName, value) : ipcRenderer.sendSync(propertyName, oid, value)
  if (res.err) {
    throw createError(res.err)
  }
  return res.data
}

function createError (obj) {
  const g = typeof window === 'undefined' ? global : window
  const err = g[obj._constructor] ? new g[obj._constructor]() : new Error()
  delete obj._constructor

  for (let key in obj) {
    err[key] = obj[key]
  }

  return err
}

module.exports = {
  importClass
}
