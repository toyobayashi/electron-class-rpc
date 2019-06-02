if (!process.versions.electron || process.type !== 'renderer') {
  throw new Error('Not electron renderer process.')
}

module.exports = require('./lib/renderer.js')
