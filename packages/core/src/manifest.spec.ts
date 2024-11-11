import assert from 'assert';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { safeLoad } from 'js-yaml';
import { expect, test } from 'vitest';
import { parseManifest } from './manifest';

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

test('parse "eventHandlers"', async () => {
  const yaml = safeLoad(await readFile(join(stubsPath, 'block-handler.yaml'), 'utf8'));
  const manifest = parseManifest(yaml);
  const eventHandlers = manifest.dataSources.map(({ mapping }) => mapping.eventHandlers).flat();

  expect(eventHandlers.length).toBe(1);
});

test('parse "package source"', async () => {
  const yaml = safeLoad(await readFile(join(stubsPath, 'substream-subgraph.yaml'), 'utf8'));
  const manifest = parseManifest(yaml);
  const substream = manifest.dataSources.find(({ kind }) => kind === 'substreams');

  assert(substream);
  assert(substream.kind === 'substreams');
  expect(substream.source.package.moduleName).equal('graph_out');
});

test('parse "substreams params"', async () => {
  const yaml = safeLoad(
    await readFile(join(stubsPath, 'substream-subgraph-with-params.yaml'), 'utf8'),
  );
  const manifest = parseManifest(yaml);
  const substream = manifest.dataSources.find(({ kind }) => kind === 'substreams');

  assert(substream);
  assert(substream.kind === 'substreams');
  expect(substream.source.package.params).toEqual(['a', 'b', 123]);
});
