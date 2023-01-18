import fs from 'fs';
import path from 'path';

const packageJson = JSON.parse(
  fs
    .readFileSync(
      // works even when bundled/built because the path to package.json is the same
      path.join(__dirname, '..', 'package.json'),
    )
    .toString(),
);

export const version = packageJson.version as string;
