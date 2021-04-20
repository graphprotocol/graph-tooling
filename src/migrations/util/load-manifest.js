const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')

function loadManifest(manifestFile) {
  if(manifestFile.match(/.js$/)) {
    return require(path.resolve(manifestFile))
  }
  else {
    return yaml.safeLoad(fs.readFileSync(manifestFile, 'utf-8'))
  }
}

module.exports = {
  loadManifest
}