import { expect, test } from 'vitest';
import { parseManifest } from './manifest';
import { safeLoad } from 'js-yaml';
import { join } from 'path';
import { readFile } from 'fs/promises';

const stubsPath = join(__dirname, '..', 'stubs');

test('parse "blockHandlers"', async () => {
  const yaml = safeLoad(await readFile(join(stubsPath, 'block-handler.yaml'), 'utf8'));
  const manifest = parseManifest(yaml);
  const blockHandler = manifest.dataSources.map(({ mapping }) => mapping.blockHandlers).flat();

  expect(blockHandler.length).toBe(1);
});

test('parse "callHandlers"', async () => {
  const yaml = safeLoad(await readFile(join(stubsPath, 'block-handler.yaml'), 'utf8'));
  const manifest = parseManifest(yaml);
  const blockHandler = manifest.dataSources.map(({ mapping }) => mapping.callHandlers).flat();

  expect(blockHandler.length).toBe(1);
});
