import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(
  fs
    .readFileSync(
      // works even when bundled/built because the path to package.json is the same
      path.join(
        `${process.platform === 'win32' ? '' : '/'}${fileURLToPath(import.meta.url)}`,
        '..',
        '..',
        'package.json',
      ),
    )
    .toString(),
);

export const version = packageJson.version as string;
export const nodeVersion = (packageJson.engines?.node ?? '') as string;
