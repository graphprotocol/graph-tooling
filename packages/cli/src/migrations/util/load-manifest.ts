import path from 'path';
import fs from 'fs-extra';
import yaml from 'js-yaml';

export async function loadManifest(manifestFile: string) {
  if (manifestFile.match(/.js$/)) {
    return await import(path.resolve(manifestFile));
  }
  return yaml.load(await fs.readFile(manifestFile, 'utf-8'));
}
