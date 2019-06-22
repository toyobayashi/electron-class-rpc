const { ipcRenderer } = require('electron')
const generateObjectId = require('./object-id.js')

const classMap = new Map()

function importClass (className) {
  if (classMap.has(className)) return classMap.get(className)

  const classMember = resolveResponse(ipcRenderer.sendSync('__electronClassRpc_rendererApi__', 'importClass', className))

  class Clazz {
    constructor (...args) {
      const oid = generateObjectId()
      this._id = oid
      sendIpc(className, '', oid, 1, '<init>', ...args)
      classMember.publicProperties.forEach((name) => {
        Object.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          get () {
            return sendIpc(className, '', oid, 0, name, 'get')
          },
          set (value) {
            sendIpc(className, '', oid, 0, name, 'set', value)
          }
        })
      })
    }

    destroy () {
      sendIpc(className, '', this._id, 1, '<delete>', this._id)
    }
  }

  classMember.publicStaticProperties.forEach((name) => {
    Object.defineProperty(Clazz, name, {
      configurable: true,
      enumerable: true,
      get () {
        return sendIpc(className, '', '', 0, name, 'get')
      },
      set (value) {
        sendIpc(className, '', '', 0, name, 'set', value)
      }
    })
  })

  classMember.publicMethods.forEach((methodName) => {
    Clazz.prototype[methodName] = function (...args) {
      return methodName.endsWith('Sync') ? sendIpc(className, '', this._id, 1, methodName, ...args) : callMain(className, methodName, this._id, ...args)
    }
  })

  classMember.publicStaticMethods.forEach((methodName) => {
    Clazz[methodName] = function (...args) {
      return methodName.endsWith('Sync') ? sendIpc(className, '', '', 1, methodName, ...args) : callMain(className, methodName, '', ...args)
    }
  })

  classMap.set(className, Clazz)
  return Clazz
}

function callMain (className, methodName, oid, ...args) {
  return new Promise((resolve, reject) => {
    let _callId = generateObjectId()

    ipcRenderer.once(`__electronClassRpc_call_${_callId}_`, (_e, res) => {
      _callId = null
      if (res.err) {
        reject(createError(res.err))
      } else {
        resolve(res.data)
      }
    })

    ipcRenderer.send('__electronClassRpc__', className, _callId, oid, 1, methodName, ...args)
  })
}

function listClass () {
  return ipcRenderer.sendSync('__electronClassRpc_rendererApi__', 'listClass')
}

function removeClass (className) {
  return ipcRenderer.sendSync('__electronClassRpc_rendererApi__', 'removeClass', className) && classMap.delete(className)
}

function sendIpc (className, callId, oid, type, name, ...args) {
  return resolveResponse(ipcRenderer.sendSync('__electronClassRpc__', className, callId, oid, type, name, ...args))
}

function resolveResponse (res) {
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
  importClass,
  listClass,
  removeClass
}
