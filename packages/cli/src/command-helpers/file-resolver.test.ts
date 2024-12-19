import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveFile } from './file-resolver';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('resolveFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any temp directories that might have been created
    const dirs = await fs.readdir(os.tmpdir());
    for (const dir of dirs) {
      if (dir.startsWith('graph-file-')) {
        await fs.remove(path.join(os.tmpdir(), dir));
      }
    }
  });

  it('should handle local files', async () => {
    const testFile = path.join(os.tmpdir(), 'test.txt');
    await fs.writeFile(testFile, 'test content');

    const result = await resolveFile(testFile, 'test.txt');
    expect(result.path).toBe(testFile);
    expect(result.cleanup).toBeUndefined();

    await fs.remove(testFile);
  });

  it('should handle HTTP URLs with redirects', async () => {
    const testUrl = 'https://example.com/file.txt';
    const testContent = 'test content';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Buffer.from(testContent),
    });

    const result = await resolveFile(testUrl, 'file.txt');

    expect(mockFetch).toHaveBeenCalledWith(testUrl, { redirect: 'follow' });
    expect(result.path).toMatch(/graph-file-.*\/file\.txt$/);
    expect(result.cleanup).toBeDefined();
    expect(await fs.readFile(result.path, 'utf-8')).toBe(testContent);

    if (result.cleanup) {
      result.cleanup();
    }
  });

  it('should handle IPFS hashes', async () => {
    const ipfsHash = 'QmTest';
    const testContent = 'test content';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => Buffer.from(testContent),
    });

    const result = await resolveFile(ipfsHash, 'file.txt');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(ipfsHash));
    expect(result.path).toMatch(/graph-file-.*\/file\.txt$/);
    expect(result.cleanup).toBeDefined();
    expect(await fs.readFile(result.path, 'utf-8')).toBe(testContent);

    if (result.cleanup) {
      result.cleanup();
    }
  });

  it('should handle failed HTTP fetches', async () => {
    const testUrl = 'https://example.com/file.txt';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(resolveFile(testUrl, 'file.txt')).rejects.toThrow(
      `Failed to resolve ${testUrl} - failed to fetch from URL: Not Found`,
    );
  });

  it('should handle network errors', async () => {
    const testUrl = 'https://example.com/file.txt';

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(resolveFile(testUrl, 'file.txt')).rejects.toThrow(
      `Failed to resolve ${testUrl} - Network error`,
    );
  });

  it('should handle timeout', async () => {
    const testUrl = 'https://example.com/file.txt';

    mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 2000)));

    await expect(resolveFile(testUrl, 'file.txt', 100)).rejects.toThrow('File download timed out');
  });

  it('should clean up temp files on error', async () => {
    const testUrl = 'https://example.com/file.txt';

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    try {
      await resolveFile(testUrl, 'file.txt');
    } catch (e) {
      // Expected error
    }

    const dirs = await fs.readdir(os.tmpdir());
    const graphTempDirs = dirs.filter(dir => dir.startsWith('graph-file-'));
    expect(graphTempDirs).toHaveLength(0);
  });
});
