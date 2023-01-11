import fs from 'fs-extra'
import path from 'path'
import yaml from 'js-yaml'

export async function loadManifest(manifestFile: string) {
  if (manifestFile.match(/.js$/)) {
    return require(path.resolve(manifestFile))
  } else {
    return yaml.safeLoad(await fs.readFile(manifestFile, 'utf-8'))
  }
}
