import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBinary } from './download-binary.js';

describe('downloadBinary', () => {
  let dir: string;
  let destination: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-download-'));
    destination = path.join(dir, 'matchstick');
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('publishes only a complete executable after the download closes', async () => {
    let finish!: () => void;
    let started!: () => void;
    const writing = new Promise<void>(resolve => {
      started = resolve;
    });
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('#!/bin/sh\n'));
        finish = () => {
          controller.enqueue(new TextEncoder().encode('exit 0\n'));
          controller.close();
        };
        started();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body)),
    );
    const pending = downloadBinary('https://example.test/binary', destination);
    await writing;
    await vi.waitFor(async () => {
      const stagingDir = (await fs.readdir(dir)).find(name => name.startsWith('.matchstick-'));
      expect(stagingDir).toBeDefined();
      expect(await fs.readFile(path.join(dir, stagingDir!, 'binary'), 'utf8')).toBe('#!/bin/sh\n');
    });
    await expect(fs.access(destination)).rejects.toThrow();
    finish();
    await pending;
    expect(await fs.readFile(destination, 'utf8')).toBe('#!/bin/sh\nexit 0\n');
    expect((await fs.stat(destination)).mode & 0o777).toBe(0o755);
    expect(await fs.readdir(dir)).toEqual(['matchstick']);
  });

  it('handles competing downloads without overwriting the published binary', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('complete executable')),
    );
    await Promise.all(
      Array.from({ length: 8 }, () => downloadBinary('https://example.test/binary', destination)),
    );
    expect(await fs.readFile(destination, 'utf8')).toBe('complete executable');
    expect(await fs.readdir(dir)).toEqual(['matchstick']);
  });

  it('does not replace an executable already published by another process', async () => {
    await fs.writeFile(destination, 'already running');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('new download')),
    );
    await downloadBinary('https://example.test/binary', destination);
    expect(await fs.readFile(destination, 'utf8')).toBe('already running');
    expect(await fs.readdir(dir)).toEqual(['matchstick']);
  });

  it('cleans failed downloads without creating a cache entry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.error(new Error('download failed'));
              },
            }),
          ),
      ),
    );
    await expect(downloadBinary('https://example.test/binary', destination)).rejects.toThrow(
      'download failed',
    );
    expect(await fs.readdir(dir)).toEqual([]);
  });
});
