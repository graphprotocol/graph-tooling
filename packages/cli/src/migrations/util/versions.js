const path = require('path')
const fs = require('fs-extra')
const yaml = require('js-yaml')

const getGraphTsVersion = async sourceDir => {
  let graphTsPath

  for (
    let dir = path.resolve(sourceDir);
    // Terminate after the root dir or when we have found node_modules
    dir !== undefined;
    // Continue with the parent directory, terminate after the root dir
    dir = path.dirname(dir) === dir ? undefined : path.dirname(dir)
  ) {
    let graphTsNodeModulesPath = path.join(
      dir,
      'node_modules',
      '@graphprotocol',
      'graph-ts',
    )

    if (fs.existsSync(graphTsNodeModulesPath)) {
      graphTsPath = graphTsNodeModulesPath
      // Loop until we find the first occurrence of graph-ts in node_modules
      break
    }
  }

  let pkgJsonFile = path.join(
    graphTsPath,
    'package.json',
  )
  let data = await fs.readFile(pkgJsonFile)
  let jsonData = JSON.parse(data)
  return jsonData.version
}

module.exports = {
  getGraphTsVersion,
}
