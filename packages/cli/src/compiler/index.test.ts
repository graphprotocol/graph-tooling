import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import immutable from 'immutable';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Protocol from '../protocols/index.js';
import * as asc from './asc.js';
import Compiler from './index.js';

vi.mock('./asc.js', () => ({ ready: vi.fn(), compile: vi.fn() }));

// A valid WASM module exporting a single no-op function named `present`.
const wasm = Buffer.from([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 11, 1, 7, 112, 114, 101, 115, 101,
  110, 116, 0, 0, 10, 4, 1, 2, 0, 11,
]);

describe('compiled mapping handler validation', () => {
  let dir: string;
  let compiler: Compiler;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-handlers-'));
    await fs.writeFile(path.join(dir, 'mapping.ts'), 'export function present(): void {}');
    // Substreams avoids resolving graph-ts for this compiler unit test.
    compiler = new Compiler({
      ipfs: undefined,
      subgraphManifest: path.join(dir, 'subgraph.yaml'),
      outputDir: path.join(dir, 'build'),
      outputFormat: 'wasm',
      skipMigrations: true,
      protocol: new Protocol('substreams'),
    });
    Object.assign(compiler, { protocol: new Protocol('ethereum'), globalsFile: 'global.ts' });
    vi.mocked(asc.compile).mockImplementation(({ baseDir, outputFile }) => {
      fs.outputFileSync(path.resolve(baseDir, outputFile), wasm);
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await fs.remove(dir);
  });

  function mapping(name: string, handler: string) {
    return {
      name,
      mapping: { file: './mapping.ts', eventHandlers: [{ handler, event: 'Event()' }] },
    };
  }

  it.each([false, true])('rejects missing template handlers (cached: %s)', async cached => {
    const manifest = immutable.fromJS({
      dataSources: cached ? [mapping('Source', 'present')] : [],
      templates: [mapping('Template', 'missing')],
    });
    await expect(compiler.compileSubgraph(manifest, true)).rejects.toThrow(
      'Missing handlers in WASM: missing',
    );
  });

  it('checks each data source even when its mapping is cached', async () => {
    const manifest = immutable.fromJS({
      dataSources: [mapping('First', 'present'), mapping('Second', 'missing')],
    });
    await expect(compiler.compileSubgraph(manifest, true)).rejects.toThrow(
      'Missing handlers in WASM: missing',
    );
  });

  it('reuses valid mappings without compiling them twice', async () => {
    const manifest = immutable.fromJS({
      dataSources: [mapping('Source', 'present')],
      templates: [mapping('Template', 'present')],
    });
    await compiler.compileSubgraph(manifest, true);
    expect(asc.compile).toHaveBeenCalledTimes(1);
  });

  it('retains the option to skip handler validation', async () => {
    await compiler.compileSubgraph(
      immutable.fromJS({
        dataSources: [],
        templates: [mapping('Template', 'missing')],
      }),
      false,
    );
  });
});
