(function main () {
  if (!process.versions.electron) {
    throw new Error('Not electron environment.')
  }

  switch (process.type) {
    case 'browser':
      module.exports = require('./lib/main.js')
      break
    case 'renderer':
      module.exports = require('./lib/renderer.js')
      break
    default:
      throw new Error('Not electron environment.')
  }
})()
