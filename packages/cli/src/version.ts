import fs from 'fs';
import path from 'path';

const packageJson = JSON.parse(
  fs
    .readFileSync(
      // works even when bundled/built because the path to package.json is the same
      path.join(
        `${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)![1]}`,
        '..',
        'package.json',
      ),
    )
    .toString(),
);

export const version = packageJson.version as string;
