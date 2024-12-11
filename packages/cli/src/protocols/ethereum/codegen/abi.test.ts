import path from 'node:path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import ABI from '../abi.js';
import AbiCodeGenerator from './abi.js';

let tempdir: string;
let abi: ABI;
let generatedTypes: any[] = [];

describe.concurrent('ABI code generation', () => {
  beforeAll(async () => {
    tempdir = await fs.mkdtemp('abi-codegen');

    try {
      const filename = path.join(tempdir, 'ABI.json');
      await fs.writeFile(
        filename,
        JSON.stringify([
          {
            constant: true,
            inputs: [],
            name: 'read',
            outputs: [{ name: '', type: 'bytes32' }],
            payable: false,
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: 'proposalId',
                type: 'uint256',
              },
              {
                components: [
                  {
                    name: 'foo',
                    type: 'uint8',
                  },
                  {
                    name: 'bar',
                    type: 'tuple',
                    components: [{ name: 'baz', type: 'address' }],
                  },
                ],
                name: '',
                type: 'tuple',
              },
            ],
            name: 'getProposal',
            outputs: [
              {
                components: [
                  {
                    name: 'result',
                    type: 'uint8',
                  },
                  {
                    name: 'target',
                    type: 'address',
                  },
                  {
                    name: 'data',
                    type: 'bytes',
                  },
                  {
                    name: 'proposer',
                    type: 'address',
                  },
                  {
                    name: 'feeRecipient',
                    type: 'address',
                  },
                  {
                    name: 'fee',
                    type: 'uint256',
                  },
                  {
                    name: 'startTime',
                    type: 'uint256',
                  },
                  {
                    name: 'yesCount',
                    type: 'uint256',
                  },
                  {
                    name: 'noCount',
                    type: 'uint256',
                  },
                ],
                name: '',
                type: 'tuple',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            type: 'function',
            stateMutability: 'view',
            payable: 'false',
            name: 'getProposals',
            outputs: [
              {
                type: 'uint256',
                name: 'size',
              },
              {
                type: 'tuple[]',
                components: [
                  { name: 'first', type: 'uint256' },
                  { name: 'second', type: 'string' },
                ],
              },
            ],
          },
          {
            type: 'function',
            stateMutability: 'view',
            name: 'overloaded',
            inputs: [
              {
                type: 'string',
              },
            ],
            outputs: [
              {
                type: 'string',
              },
            ],
          },
          {
            type: 'function',
            stateMutability: 'view',
            name: 'overloaded',
            inputs: [
              {
                type: 'uint256',
              },
            ],
            outputs: [
              {
                type: 'string',
              },
            ],
          },
          {
            type: 'function',
            stateMutability: 'view',
            name: 'overloaded',
            inputs: [
              {
                type: 'bytes32',
              },
            ],
            outputs: [
              {
                type: 'string',
              },
            ],
          },
        ]),
        'utf-8',
      );
      abi = ABI.load('Contract', filename);
      const codegen = new AbiCodeGenerator(abi);
      generatedTypes = await codegen.generateTypes();
    } finally {
      await fs.remove(tempdir);
    }
  });

  afterAll(async () => {
    await fs.remove(tempdir);
  });

  describe('Generated types', () => {
    test(`Type test`, () => {
      for (const generatedType of generatedTypes) {
        expect(generatedType).toMatchSnapshot();
      }
    });
  });
});
