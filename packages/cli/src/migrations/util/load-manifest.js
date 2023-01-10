import fs from 'fs-extra'
import path from 'path'
import yaml from 'js-yaml'

async function loadManifest(manifestFile) {
  if (manifestFile.match(/.js$/)) {
    return require(path.resolve(manifestFile))
  } else {
    return yaml.safeLoad(await fs.readFile(manifestFile, 'utf-8'))
  }
}

export { loadManifest }
