if (!process.versions.electron || process.type !== 'browser') {
  throw new Error('Not electron main process.')
}

module.exports = require('./lib/main.js')
