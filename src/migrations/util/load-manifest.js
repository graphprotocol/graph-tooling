const fs = require('fs-extra')
const path = require('path')

function loadManifest(manifestFile) {
  try {
    return require(path.resolve(manifestFile))
  }
  catch(_) {
    return yaml.safeLoad(fs.readFileSync(manifestFile, 'utf-8'))
  }
}

module.exports = {
  loadManifest
}