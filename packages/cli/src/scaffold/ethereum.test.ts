import immutable from 'immutable';
import { describe, expect, test } from 'vitest';
import ABI from '../protocols/ethereum/abi.js';
import Protocol from '../protocols/index.js';
import Scaffold from './index.js';

const TEST_EVENT = {
  name: 'ExampleEvent',
  type: 'event',
  inputs: [
    { name: 'a', type: 'uint256', indexed: true },
    { name: 'b', type: 'bytes[4]' },
    { type: 'string' },
    {
      name: 'c',
      type: 'tuple',
      components: [
        { name: 'c1', type: 'uint256' },
        { type: 'bytes32' },
        { type: 'string' },
        {
          name: 'c3',
          type: 'tuple',
          components: [{ name: 'c31', type: 'uint96' }, { type: 'string' }, { type: 'bytes32' }],
        },
      ],
    },
    { name: 'd', type: 'string', indexed: true },
    { name: 'id', type: 'string' },
  ],
};

const OVERLOADED_EVENT = {
  name: 'ExampleEvent',
  type: 'event',
  inputs: [{ name: 'a', type: 'bytes32' }],
};

const TEST_CONTRACT = {
  name: 'ExampleContract',
  type: 'contract',
};

const TEST_CALLABLE_FUNCTIONS = [
  {
    name: 'someVariable',
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getSomeValue',
    type: 'function',
    stateMutability: 'pure',
    outputs: [{ type: 'tuple', components: [{ type: 'uint256' }] }],
  },
];

const TEST_TUPLE_ARRAY_EVENT = {
  name: 'TupleArrayEvent',
  type: 'event',
  inputs: [
    {
      name: 'tupleArray',
      type: 'tuple[]',
      components: [
        { name: 'field1', type: 'uint256' },
        { name: 'field2', type: 'address' },
      ],
    },
    { name: 'addressArray', type: 'address[]' },
  ],
};

const TEST_ABI = new ABI(
  'Contract',
  undefined,
  immutable.fromJS([
    TEST_EVENT,
    OVERLOADED_EVENT,
    TEST_TUPLE_ARRAY_EVENT,
    TEST_CONTRACT,
    ...TEST_CALLABLE_FUNCTIONS,
  ]),
);

const protocol = new Protocol('ethereum');

const scaffoldOptions = {
  protocol,
  abi: TEST_ABI,
  contract: '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d',
  network: 'kovan',
  contractName: 'Contract',
  startBlock: '12345',
};

const scaffold = new Scaffold(scaffoldOptions);

const scaffoldWithIndexEvents = new Scaffold({
  ...scaffoldOptions,
  indexEvents: true,
});

describe('Ethereum subgraph scaffolding', () => {
  test('Manifest', async () => {
    expect(await scaffold.generateManifest()).toMatchSnapshot();
  });

  test('Schema (default)', async () => {
    expect(await scaffold.generateSchema()).toMatchSnapshot();
  });

  test('Schema (for indexing events)', async () => {
    expect(await scaffoldWithIndexEvents.generateSchema()).toMatchSnapshot();
  });

  test('Mapping (default)', async () => {
    expect(await scaffold.generateMapping()).toMatchSnapshot();
  });

  test('Mapping (for indexing events)', async () => {
    expect(await scaffoldWithIndexEvents.generateMapping()).toMatchSnapshot();
  });

  test('Mapping handles tuple array type conversion', async () => {
    expect(await scaffold.generateMapping()).toMatchSnapshot();
  });

  test('Test Files (default)', async () => {
    const files = await scaffoldWithIndexEvents.generateTests();
    const testFile = files?.['contract.test.ts'];
    const utilsFile = files?.['contract-utils.ts'];

    expect(testFile).toMatchSnapshot();
    expect(utilsFile).toMatchSnapshot();
  });

  test('Test Files (for indexing events)', async () => {
    const files = await scaffoldWithIndexEvents.generateTests();
    const testFile = files?.['contract.test.ts'];
    const utilsFile = files?.['contract-utils.ts'];

    expect(testFile).toMatchSnapshot();
    expect(utilsFile).toMatchSnapshot();
  });
});
