// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

const classRpcMain = require('../main.js')

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
    console.log('The member whose name starts width "_" is recognized as a private member and it won\'t be exported.')
  }
}

classRpcMain.exportClass('ApiClass', ApiClass)
