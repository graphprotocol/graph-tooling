const fs = require('fs-extra')
const path = require('path')
const immutable = require('immutable')

const ABI = require('../abi')
const ts = require('./typescript')
const AbiCodeGenerator = require('./abi')

let tempdir
let abi
let generatedTypes

describe('ABI code generation', () => {
  beforeAll(() => {
    tempdir = fs.mkdtempSync('abi-codegen')

    try {
      let filename = path.join(tempdir, 'ABI.json')
      fs.writeFileSync(
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
        ]),
        'utf-8',
      )
      abi = ABI.load('Contract', filename)
      let codegen = new AbiCodeGenerator(abi)
      generatedTypes = codegen.generateTypes()
    } finally {
      fs.removeSync(tempdir)
    }
  })

  afterAll(() => {
    fs.removeSync(tempdir)
  })

  describe('Generated types', () => {
    test('All expected types are generated', () => {
      expect(generatedTypes.map(type => type.name)).toEqual([
        'Contract__getProposalResultValue0Struct',
        'Contract__getProposalInputParam1Struct',
        'Contract__getProposalInputParam1BarStruct',
        'Contract',
      ])
    })
  })

  describe('Contract class', () => {
    test('Exists', () => {
      expect(generatedTypes.find(type => type.name === 'Contract')).toBeDefined()
    })

    test('Has methods', () => {
      let contract = generatedTypes.find(type => type.name === 'Contract')
      expect(contract.methods).toBeInstanceOf(Array)
    })

    test('Has `bind` method', () => {
      let contract = generatedTypes.find(type => type.name === 'Contract')
      expect(contract.methods.find(method => method.name === 'bind')).toBeDefined()
    })

    test('Has methods for all callable functions', () => {
      let contract = generatedTypes.find(type => type.name === 'Contract')
      expect(contract.methods.map(method => method.name)).toContain('getProposal')
    })
  })

  describe('Methods for callable functions', () => {
    test('Have correct parameters', () => {
      let contract = generatedTypes.find(type => type.name === 'Contract')
      expect(contract.methods.map(method => [method.name, method.params])).toEqual([
        ['bind', immutable.List([ts.param('address', 'Address')])],
        ['read', immutable.List()],
        ['try_read', immutable.List()],
        [
          'getProposal',
          immutable.List([
            ts.param('proposalId', 'BigInt'),
            ts.param('param1', 'Contract__getProposalInputParam1Struct'),
          ]),
        ],
        [
          'try_getProposal',
          immutable.List([
            ts.param('proposalId', 'BigInt'),
            ts.param('param1', 'Contract__getProposalInputParam1Struct'),
          ]),
        ],
      ])
    })

    test('Have correct return types', () => {
      let contract = generatedTypes.find(type => type.name === 'Contract')
      expect(contract.methods.map(method => [method.name, method.returnType])).toEqual([
        ['bind', ts.namedType('Contract')],
        ['read', ts.namedType('Bytes')],
        ['try_read', 'CallResult<Bytes>'],
        ['getProposal', ts.namedType('Contract__getProposalResultValue0Struct')],
        ['try_getProposal', 'CallResult<Contract__getProposalResultValue0Struct>'],
      ])
    })
  })

  describe('Tuples', () => {
    test('Tuple types exist for function parameters', () => {
      let tupleType = generatedTypes.find(
        type => type.name === 'Contract__getProposalInputParam1Struct',
      )

      // Verify that the tuple type has methods
      expect(tupleType.methods).toBeDefined()

      // Verify that the tuple type has getters for all tuple fields with
      // the right return types
      expect(tupleType.methods.map(method => [method.name, method.returnType])).toEqual([
        ['get foo', 'i32'],
        ['get bar', 'Contract__getProposalInputParam1BarStruct'],
      ])

      // Inner tuple:
      tupleType = generatedTypes.find(
        type => type.name === 'Contract__getProposalInputParam1BarStruct',
      )

      // Verify that the tuple type has methods
      expect(tupleType.methods).toBeDefined()

      // Verify that the tuple type has getters for all tuple fields with
      // the right return types
      expect(tupleType.methods.map(method => [method.name, method.returnType])).toEqual([
        ['get baz', 'Address'],
      ])
    })

    test('Tuple types exist for function return values', () => {
      let tupleType = generatedTypes.find(
        type => type.name === 'Contract__getProposalResultValue0Struct',
      )

      // Verify that the tuple type has methods
      expect(tupleType.methods).toBeDefined()

      // Verify that the tuple type has getters for all tuple fields with
      // the right return types
      expect(tupleType.methods.map(method => [method.name, method.returnType])).toEqual([
        ['get result', 'i32'],
        ['get target', 'Address'],
        ['get data', 'Bytes'],
        ['get proposer', 'Address'],
        ['get feeRecipient', 'Address'],
        ['get fee', 'BigInt'],
        ['get startTime', 'BigInt'],
        ['get yesCount', 'BigInt'],
        ['get noCount', 'BigInt'],
      ])
    })
  })
})
