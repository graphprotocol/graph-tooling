import { describe, expect, test } from 'vitest';
import Protocol from '../protocols/index.js';
import Scaffold from './index.js';

const protocol = new Protocol('near');

const scaffoldOptions = {
  protocol,
  contract: 'abc.def.near',
  network: 'near-mainnet',
  contractName: 'Contract',
};

const scaffold = new Scaffold(scaffoldOptions);

describe('NEAR subgraph scaffolding', () => {
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
