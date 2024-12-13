import { describe, expect, test } from 'vitest';
import Protocol from '../protocols/index.js';
import Scaffold from './index.js';

const protocol = new Protocol('cosmos');

const scaffoldOptions = {
  protocol,
  network: 'cosmoshub-4',
  contractName: 'CosmosHub',
};

const scaffold = new Scaffold(scaffoldOptions);

describe('Cosmos subgraph scaffolding', () => {
  test('Manifest', async () => {
    expect(await scaffold.generateManifest()).toMatchSnapshot();
  });

  test('Schema (default)', async () => {
    expect(await scaffold.generateSchema()).toMatchSnapshot();
  });

  test('Mapping (default)', async () => {
    expect(await scaffold.generateMapping()).toMatchSnapshot();
  });
});
