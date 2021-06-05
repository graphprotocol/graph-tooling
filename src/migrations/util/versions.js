const path = require('path')
const fs = require('fs-extra')
const yaml = require('js-yaml')

const getGraphTsVersion = async sourceDir => {
  let pkgJsonFile = path.join(
    sourceDir,
    'node_modules',
    '@graphprotocol',
    'graph-ts',
    'package.json',
  )
  let data = await fs.readFile(pkgJsonFile)
  let jsonData = JSON.parse(data)
  return jsonData.version
}

module.exports = {
  getGraphTsVersion,
}
