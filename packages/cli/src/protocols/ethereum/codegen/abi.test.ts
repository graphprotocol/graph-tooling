import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import ABI from '../abi';
import AbiCodeGenerator from './abi';

let tempdir: string;
let abi: ABI;
let generatedTypes: any[];

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
      generatedTypes = codegen.generateTypes();
    } finally {
      await fs.remove(tempdir);
    }
  });

  afterAll(async () => {
    await fs.remove(tempdir);
  });

  describe('Generated types', () => {
    test('All expected types are generated', () => {
      expect(generatedTypes.map(type => type.name)).toMatchSnapshot()
    });
  });

  describe('Contract class', () => {
    test('Exists', () => {
      expect(generatedTypes.find(type => type.name === 'Contract')).toBeDefined();
    });

    test('Has methods', () => {
      const contract = generatedTypes.find(type => type.name === 'Contract');
      expect(contract.methods).toBeInstanceOf(Array);
    });

    test('Has `bind` method', () => {
      const contract = generatedTypes.find(type => type.name === 'Contract');
      expect(contract.methods.find((method: any) => method.name === 'bind')).toBeDefined();
    });

    test('Has methods for all callable functions', () => {
      const contract = generatedTypes.find(type => type.name === 'Contract');
      expect(contract.methods.map((method: any) => method.name)).toContain('getProposal');
    });
  });

  describe('Methods for callable functions', () => {
    test('Have correct parameters', () => {
      const contract = generatedTypes.find(type => type.name === 'Contract');
      expect(contract.methods.map((method: any) => [method.name, method.params])).toMatchSnapshot()
    });

    test('Have correct return types', () => {
      const contract = generatedTypes.find(type => type.name === 'Contract');
      expect(contract.methods.map((method: any) => [method.name, method.returnType])).toMatchSnapshot()
    });
  });

  describe('Tuples', () => {
    test('Tuple types exist for function parameters', () => {
      let tupleType = generatedTypes.find(
        type => type.name === 'Contract__getProposalInputParam1Struct',
      );

      // Verify that the tuple type has methods
      expect(tupleType.methods).toBeDefined();

      // Verify that the tuple type has getters for all tuple fields with
      // the right return types
      expect(tupleType.methods.map((method: any) => [method.name, method.returnType])).toMatchSnapshot()

      // Inner tuple:
      tupleType = generatedTypes.find(
        type => type.name === 'Contract__getProposalInputParam1BarStruct',
      );

      // Verify that the tuple type has methods
      expect(tupleType.methods).toBeDefined();

      // Verify that the tuple type has getters for all tuple fields with
      // the right return types
      expect(tupleType.methods.map((method: any) => [method.name, method.returnType])).toMatchSnapshot()
    });

    test('Tuple types exist for function return values', () => {
      const tupleType = generatedTypes.find(
        type => type.name === 'Contract__getProposalResultValue0Struct',
      );

      // Verify that the tuple type has methods
      expect(tupleType.methods).toBeDefined();

      // Verify that the tuple type has getters for all tuple fields with
      // the right return types
      expect(tupleType.methods.map((method: any) => [method.name, method.returnType])).toMatchSnapshot()
    });

    test('Function bodies are generated correctly for tuple arrays', () => {
      const contract = generatedTypes.find(type => type.name === 'Contract');
      const getter = contract.methods.find((method: any) => method.name === 'getProposals');

      expect(getter.body).not.toContain('toTupleArray<undefined>');
      expect(getter.body).toContain(
        'result[1].toTupleArray<Contract__getProposalsResultValue1Struct>()',
      );
    });
  });
});
