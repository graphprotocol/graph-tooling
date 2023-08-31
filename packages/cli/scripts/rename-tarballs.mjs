/* eslint-disable */
// eslint is just straight up wrong here

import fs from 'fs/promises';
import path from 'path';
import { globIterate } from 'glob';

async function main() {
  for await (const tarball of globIterate('dist/*.tar.gz')) {
    // tarball is in format graph-<version>-<commit>-<target>.tar.gz
    // for example: graph-v0.47.1-dcc9923-linux-arm.tar.gz
    // in order to simplify the tarball names for easier installation,
    // we remove the version and commit from the name since they'll be
    // uploaded to the GH release notes assets anyway
    const [graph, _version, _commit, ...target] = tarball.split('-');
    console.log(`Found ${tarball}`);
    if (target.length) {
      // only rename if target part exists (otherwise tarballs was already renamed)
      const newTarball = [graph, ...target].join('-');
      console.log(`\tRenaming ${path.basename(tarball)} to ${path.basename(newTarball)}...`);
      await fs.rename(tarball, newTarball);
    } else {
      console.log('\tSkipping rename...');
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
