import fs from 'fs-extra';
import { parseManifest } from '@graphprotocol/graph-cli-core';

export async function loadManifest(manifestFileName: string) {
  // if (manifestFile.match(/.js$/)) {
  //   return require(path.resolve(manifestFile));
  // }
  return parseManifest(await fs.readFile(manifestFileName, 'utf-8'));
}
