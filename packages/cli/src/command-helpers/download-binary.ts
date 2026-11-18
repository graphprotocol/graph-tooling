import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

/** Publish a complete executable without exposing partial downloads to other CLI processes. */
export async function downloadBinary(url: string, destination: string) {
  const dir = path.dirname(destination);
  await fs.promises.mkdir(dir, { recursive: true });
  const stagingDir = await fs.promises.mkdtemp(path.join(dir, '.matchstick-'));
  const stagingPath = path.join(stagingDir, 'binary');
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status: ${response.statusText}`);
    if (!response.body) throw new Error('No response body received');
    await pipeline(response.body, fs.createWriteStream(stagingPath, { flags: 'wx' }));
    await fs.promises.chmod(stagingPath, '755');
    try {
      // A hard link atomically publishes the closed, executable file. Another
      // downloader may have won the race; its complete binary is equally usable.
      await fs.promises.link(stagingPath, destination);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  } finally {
    await fs.promises.rm(stagingDir, { recursive: true, force: true });
  }
}
