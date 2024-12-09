import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import fetch from '../fetch.js';
import { DEFAULT_IPFS_URL } from './ipfs.js';

export interface FileSource {
  path: string;
  cleanup?: () => void;
}

export async function resolveFile(
  source: string,
  fileName: string,
  timeout: number = 10_000,
): Promise<FileSource> {
  const timeoutPromise = new Promise<FileSource>((_, reject) => {
    setTimeout(() => reject(new Error('File download timed out')), timeout);
  });

  const resolvePromise = async (): Promise<FileSource> => {
    // If it's a local file
    try {
      await fs.access(source, fs.constants.R_OK);
      const stats = await fs.stat(source);
      if (!stats.isFile()) {
        throw new Error('Must be a file');
      }
      return { path: source };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Local file is not accessible: ${error.message}`);
      }
    }

    // Create temp directory for downloads
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-file-'));
    const cleanup = () => fs.removeSync(tempDir);

    try {
      // If it's an IPFS hash (Qm...)
      if (source.startsWith('Qm')) {
        const response = await fetch(`${DEFAULT_IPFS_URL}/cat?arg=${source}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from IPFS: ${response.statusText}`);
        }
        const filePath = path.join(tempDir, fileName);
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        return { path: filePath, cleanup };
      }

      // If it's a URL
      if (source.startsWith('http')) {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
        }
        const filePath = path.join(tempDir, fileName);
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        return { path: filePath, cleanup };
      }

      throw new Error('Invalid file source. Must be a file path, IPFS hash, or URL');
    } catch (error) {
      await cleanup();
      throw error;
    }
  };

  return Promise.race([resolvePromise(), timeoutPromise]);
}
